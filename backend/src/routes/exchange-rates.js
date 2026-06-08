const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

let ratesCache = null;
let cacheExpiry = 0;
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes
const DB_FRESHNESS_THRESHOLD = 7 * 24 * 60 * 60 * 1000; // 7 days
const REQUIRED_CURRENCIES = ['USD', 'NGN', 'GBP', 'EUR'];

// API Keys for both providers
const CURRENCYFREAKS_API_KEY = process.env.CURRENCYFREAKS_API_KEY?.trim() || '';
const EXCHANGERATE_API_KEY = process.env.EXCHANGERATE_API_KEY?.trim() || '';

// Updated fallback rates to realistic values (tested: ~1,365 NGN per USD)
const FALLBACK_RATES = {
  rates: { USD: 1, NGN: 1365, GBP: 0.75, EUR: 0.87 },
  data: [
    { source_currency: 'USD', target_currency: 'USD', rate: 1, last_updated: new Date().toISOString() },
    { source_currency: 'USD', target_currency: 'NGN', rate: 1365, last_updated: new Date().toISOString() },
    { source_currency: 'USD', target_currency: 'GBP', rate: 0.75, last_updated: new Date().toISOString() },
    { source_currency: 'USD', target_currency: 'EUR', rate: 0.87, last_updated: new Date().toISOString() },
  ],
};

const buildRatesMap = (rows) => {
  const map = {};
  (rows || []).forEach((row) => {
    if (row?.target_currency) {
      map[String(row.target_currency).toUpperCase()] = Number(row.rate);
    }
  });
  return map;
};

const getLatestUpdatedAt = (rows) => {
  return (rows || []).reduce((latest, row) => {
    const ts = Number(new Date(row.last_updated).getTime());
    return Number.isFinite(ts) ? Math.max(latest, ts) : latest;
  }, 0);
};

// Primary provider: CurrencyFreaks (more accurate for NGN)
const fetchFromCurrencyFreaks = async () => {
  if (!CURRENCYFREAKS_API_KEY) {
    console.warn('[EXCHANGE_RATES] CURRENCYFREAKS_API_KEY not configured');
    return null;
  }

  try {
    const response = await fetch(
      `https://api.currencyfreaks.com/v2.0/rates/latest?apikey=${CURRENCYFREAKS_API_KEY}`
    );
    if (!response.ok) {
      throw new Error(`CurrencyFreaks API returned ${response.status}`);
    }

    const data = await response.json();
    if (!data.rates || typeof data.rates !== 'object') {
      throw new Error('Invalid CurrencyFreaks API response');
    }

    // CurrencyFreaks returns rates as strings, convert to numbers
    const ratesMap = {};
    REQUIRED_CURRENCIES.forEach((currency) => {
      const rateStr = data.rates[currency];
      ratesMap[currency] = rateStr !== undefined ? Number(rateStr) : (currency === 'USD' ? 1 : 0);
    });

    // Validate rates are reasonable (guard against API errors)
    const ngnRate = ratesMap['NGN'];
    if (ngnRate && (ngnRate < 100 || ngnRate > 10000)) {
      throw new Error(`Suspicious NGN rate: ${ngnRate}`);
    }

    console.log('[EXCHANGE_RATES] CurrencyFreaks rates fetched successfully:', ratesMap);
    return ratesMap;
  } catch (err) {
    console.warn('[EXCHANGE_RATES] CurrencyFreaks failed:', err.message);
    return null;
  }
};

// Backup provider: exchangerate-api.com
const fetchFromExchangerateAPI = async () => {
  if (!EXCHANGERATE_API_KEY) {
    console.warn('[EXCHANGE_RATES] EXCHANGERATE_API_KEY not configured');
    return null;
  }

  try {
    const response = await fetch(
      `https://v6.exchangerate-api.com/v6/${EXCHANGERATE_API_KEY}/latest/USD`
    );
    if (!response.ok) {
      throw new Error(`Exchangerate-API returned ${response.status}`);
    }

    const data = await response.json();
    if (data.result !== 'success' || !data.conversion_rates || typeof data.conversion_rates !== 'object') {
      throw new Error('Invalid exchangerate-api response');
    }

    const ratesMap = {};
    REQUIRED_CURRENCIES.forEach((currency) => {
      ratesMap[currency] = Number(data.conversion_rates[currency] ?? (currency === 'USD' ? 1 : 0));
    });

    console.log('[EXCHANGE_RATES] Exchangerate-API rates fetched successfully:', ratesMap);
    return ratesMap;
  } catch (err) {
    console.warn('[EXCHANGE_RATES] Exchangerate-API failed:', err.message);
    return null;
  }
};

// Try providers in order: CurrencyFreaks → exchangerate-api
const fetchExternalRates = async () => {
  // 1. Try CurrencyFreaks (primary)
  const cfRates = await fetchFromCurrencyFreaks();
  if (cfRates) {
    return { rates: cfRates, source: 'currencyfreaks' };
  }

  // 2. Try exchangerate-api (backup)
  const erRates = await fetchFromExchangerateAPI();
  if (erRates) {
    return { rates: erRates, source: 'exchangerate' };
  }

  return null;
};

const upsertExternalRates = async (ratesMap, source) => {
  const upsertData = REQUIRED_CURRENCIES.map((currency) => ({
    source_currency: 'USD',
    target_currency: currency,
    rate: ratesMap[currency],
    last_updated: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from('exchange_rates')
    .upsert(upsertData, { onConflict: 'source_currency,target_currency' });

  if (error) {
    console.warn('[EXCHANGE_RATES] Failed to upsert rates to Supabase:', error.message);
  } else {
    console.log(`[EXCHANGE_RATES] Rates saved to database from source: ${source}`);
  }
};

router.get('/', async (req, res) => {
  try {
    const now = Date.now();

    // Return cached rates if still fresh
    if (ratesCache && now < cacheExpiry) {
      res.setHeader('Cache-Control', 'public, max-age=600, stale-while-revalidate=60');
      return res.status(200).json({ 
        success: true, 
        ...ratesCache, 
        cached: true 
      });
    }

    // Check database for rates
    const { data, error } = await supabase
      .from('exchange_rates')
      .select('source_currency, target_currency, rate, last_updated');

    let dbRates = null;
    let dbRows = null;
    let dbFresh = false;

    if (!error && data && data.length > 0) {
      dbRows = data;
      dbRates = buildRatesMap(data);
      const latestUpdatedAt = getLatestUpdatedAt(data);
      dbFresh = latestUpdatedAt > 0 && now - latestUpdatedAt < DB_FRESHNESS_THRESHOLD;
    }

    // If database has fresh rates (within 7 days), use them
    if (dbRates && dbFresh) {
      ratesCache = { rates: dbRates, data: dbRows, source: 'database' };
      cacheExpiry = now + CACHE_TTL;
      res.setHeader('Cache-Control', 'public, max-age=600, stale-while-revalidate=60');
      return res.status(200).json({ 
        success: true, 
        ...ratesCache, 
        dbFresh: true 
      });
    }

    // Try fetching from external APIs (CurrencyFreaks first, then exchangerate-api)
    const externalResult = await fetchExternalRates();

    if (externalResult) {
      const { rates: externalRates, source } = externalResult;

      ratesCache = {
        rates: externalRates,
        data: REQUIRED_CURRENCIES.map((currency) => ({
          source_currency: 'USD',
          target_currency: currency,
          rate: externalRates[currency],
          last_updated: new Date().toISOString(),
        })),
        source: source,
      };
      cacheExpiry = now + CACHE_TTL;

      // Only update database when we have fresh API data
      await upsertExternalRates(externalRates, source);

      res.setHeader('Cache-Control', 'public, max-age=600, stale-while-revalidate=60');
      return res.status(200).json({ 
        success: true, 
        ...ratesCache, 
        external: true 
      });
    }

    // If we have stale database rates (older than 7 days), use them as fallback
    if (dbRates) {
      ratesCache = { rates: dbRates, data: dbRows, source: 'database-stale' };
      cacheExpiry = now + CACHE_TTL;
      res.setHeader('Cache-Control', 'public, max-age=600, stale-while-revalidate=60');
      return res.status(200).json({ 
        success: true, 
        ...ratesCache, 
        cached: true, 
        dbFresh: false 
      });
    }

    // Last resort: use hardcoded fallback rates
    console.warn('[EXCHANGE_RATES] All sources failed, using fallback rates');
    ratesCache = FALLBACK_RATES;
    cacheExpiry = now + CACHE_TTL;
    res.setHeader('Cache-Control', 'public, max-age=600, stale-while-revalidate=60');
    return res.status(200).json({ 
      success: true, 
      ...FALLBACK_RATES, 
      fallback: true 
    });
  } catch (err) {
    console.warn('[EXCHANGE_RATES] Unhandled error, returning fallback:', err.message);
    ratesCache = FALLBACK_RATES;
    cacheExpiry = Date.now() + CACHE_TTL;
    res.setHeader('Cache-Control', 'public, max-age=600, stale-while-revalidate=60');
    return res.status(200).json({ 
      success: true, 
      ...FALLBACK_RATES, 
      fallback: true 
    });
  }
});

module.exports = router;