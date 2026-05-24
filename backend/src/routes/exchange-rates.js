const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

let ratesCache = null;
let cacheExpiry = 0;
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

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
      throw error;
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
    next(err);
  }
});

module.exports = router;
