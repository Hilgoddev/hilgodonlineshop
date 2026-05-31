const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

let ratesCache = null;
let cacheExpiry = 0;
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes
const FALLBACK_RATES = {
  rates: { USD: 1, NGN: 1550, GBP: 0.79, EUR: 0.92 },
  data: [
    { source_currency: 'USD', target_currency: 'USD', rate: 1, last_updated: new Date().toISOString() },
    { source_currency: 'USD', target_currency: 'NGN', rate: 1550, last_updated: new Date().toISOString() },
    { source_currency: 'USD', target_currency: 'GBP', rate: 0.79, last_updated: new Date().toISOString() },
    { source_currency: 'USD', target_currency: 'EUR', rate: 0.92, last_updated: new Date().toISOString() },
  ],
};

// Get all cached exchange rates (Public)
router.get('/', async (req, res, next) => {
  try {
    const now = Date.now();
    if (ratesCache && now < cacheExpiry) {
      res.setHeader('Cache-Control', 'public, max-age=600, stale-while-revalidate=60');
      return res.status(200).json({ success: true, ...ratesCache, cached: true });
    }

    const { data, error } = await supabase
      .from('exchange_rates')
      .select('source_currency, target_currency, rate, last_updated');

    if (error) {
      console.warn('[EXCHANGE_RATES] Falling back to static rates:', error.message);
      ratesCache = FALLBACK_RATES;
      cacheExpiry = now + CACHE_TTL;
      res.setHeader('Cache-Control', 'public, max-age=600, stale-while-revalidate=60');
      return res.status(200).json({ success: true, ...FALLBACK_RATES, fallback: true });
    }

    // Convert to a convenient key-value format for the frontend
    const ratesMap = {};
    (data || []).forEach((row) => {
      ratesMap[row.target_currency] = Number(row.rate);
    });

    ratesCache = {
      rates: ratesMap,
      data: data || []
    };
    cacheExpiry = now + CACHE_TTL;

    res.setHeader('Cache-Control', 'public, max-age=600, stale-while-revalidate=60');
    res.status(200).json({ success: true, ...ratesCache });
  } catch (err) {
    console.warn('[EXCHANGE_RATES] Unhandled error, returning fallback:', err.message);
    ratesCache = FALLBACK_RATES;
    cacheExpiry = Date.now() + CACHE_TTL;
    res.setHeader('Cache-Control', 'public, max-age=600, stale-while-revalidate=60');
    res.status(200).json({ success: true, ...FALLBACK_RATES, fallback: true });
  }
});

module.exports = router;
