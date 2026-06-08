require('dotenv').config();
const supabase = require('../src/config/supabase');

const CURRENCYFREAKS_API_KEY = process.env.CURRENCYFREAKS_API_KEY?.trim();
const EXCHANGERATE_API_KEY = process.env.EXCHANGERATE_API_KEY?.trim();

const REQUIRED_CURRENCIES = ['USD', 'NGN', 'GBP', 'EUR'];

async function fetchFromCurrencyFreaks() {
  if (!CURRENCYFREAKS_API_KEY) {
    console.warn('CURRENCYFREAKS_API_KEY not configured');
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

    const ratesMap = {};
    REQUIRED_CURRENCIES.forEach((currency) => {
      const rateStr = data.rates[currency];
      ratesMap[currency] = rateStr !== undefined ? Number(rateStr) : (currency === 'USD' ? 1 : 0);
    });

    // Validate rates are reasonable
    const ngnRate = ratesMap['NGN'];
    if (ngnRate && (ngnRate < 100 || ngnRate > 10000)) {
      throw new Error(`Suspicious NGN rate: ${ngnRate}`);
    }

    console.log('CurrencyFreaks rates fetched:', ratesMap);
    return ratesMap;
  } catch (err) {
    console.warn('CurrencyFreaks failed:', err.message);
    return null;
  }
}

async function fetchFromExchangerateAPI() {
  if (!EXCHANGERATE_API_KEY) {
    console.warn('EXCHANGERATE_API_KEY not configured');
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
    if (data.result !== 'success' || !data.conversion_rates) {
      throw new Error('Invalid exchangerate-api response');
    }

    const ratesMap = {};
    REQUIRED_CURRENCIES.forEach((currency) => {
      ratesMap[currency] = Number(data.conversion_rates[currency] ?? (currency === 'USD' ? 1 : 0));
    });

    console.log('Exchangerate-API rates fetched:', ratesMap);
    return ratesMap;
  } catch (err) {
    console.warn('Exchangerate-API failed:', err.message);
    return null;
  }
}

async function updateExchangeRates() {
  console.log('Starting exchange rates update...');
  let source = 'unknown';
  
  try {
    // Try CurrencyFreaks first (primary provider)
    let rates = await fetchFromCurrencyFreaks();
    if (rates) {
      source = 'currencyfreaks';
    } else {
      // Fallback to exchangerate-api
      rates = await fetchFromExchangerateAPI();
      if (rates) {
        source = 'exchangerate';
      }
    }

    if (!rates) {
      throw new Error('Both exchange rate providers failed');
    }

    console.log(`Using rates from ${source}:`, rates);

    const upsertData = REQUIRED_CURRENCIES.map((currency) => {
      const rate = rates[currency];
      if (rate === undefined || rate === 0) {
        throw new Error(`Rate for currency ${currency} not found in API response`);
      }
      return {
        source_currency: 'USD',
        target_currency: currency,
        rate: rate,
        last_updated: new Date().toISOString()
      };
    });

    console.log('Upserting rates to Supabase:', upsertData);
    const { error } = await supabase
      .from('exchange_rates')
      .upsert(upsertData, { onConflict: 'source_currency,target_currency' });

    if (error) {
      throw error;
    }

    console.log(`✅ Exchange rates successfully updated in Supabase from ${source}.`);
  } catch (err) {
    console.error('❌ Error updating exchange rates:', err.message);
    process.exit(1);
  }
}

updateExchangeRates();