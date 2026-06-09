const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { verifyToken } = require('./auth');
const requireAdmin = require('../middleware/requireAdmin');

const VALID_TYPES = ['flash', 'black_friday', 'easter'];

// Filter rows by campaign type in JS so we don't depend on the `type` column
// existing yet (before migration 011). Rows without a type are treated as 'flash'.
const ofType = (rows, type) => (rows || []).filter((r) => !type || (r.type || 'flash') === type);

// GET /api/campaigns?type=flash|black_friday|easter — public, active non-expired
router.get('/', async (req, res) => {
  try {
    const { type } = req.query;
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('flash_sales')
      .select('*, products(*)')
      .eq('is_active', true)
      .gt('expires_at', now)
      .order('created_at', { ascending: false });
    if (error) return res.json({ success: true, data: [] });
    res.json({ success: true, data: ofType(data, type) });
  } catch {
    res.json({ success: true, data: [] });
  }
});

// GET /api/campaigns/all?type= — admin, all including expired
router.get('/all', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { type } = req.query;
    const { data, error } = await supabase
      .from('flash_sales')
      .select('*, products(*)')
      .order('created_at', { ascending: false });
    if (error) return res.json({ success: true, data: [] });
    res.json({ success: true, data: ofType(data, type) });
  } catch {
    res.json({ success: true, data: [] });
  }
});

// POST /api/campaigns — admin creates a campaign (timed product discount)
router.post('/', verifyToken, requireAdmin, async (req, res, next) => {
  try {
    const { product_id, sale_price, timer_hours = 24, type = 'flash', title, theme } = req.body;
    if (!product_id || !sale_price) {
      return res.status(400).json({ success: false, error: 'product_id and sale_price are required' });
    }
    if (!VALID_TYPES.includes(type)) {
      return res.status(400).json({ success: false, error: `type must be one of ${VALID_TYPES.join(', ')}` });
    }

    const { data: product, error: prodErr } = await supabase
      .from('products')
      .select('price, name')
      .eq('id', product_id)
      .eq('is_active', true)
      .eq('status', 'approved')
      .maybeSingle();
    if (prodErr || !product) {
      return res.status(400).json({ success: false, error: 'Product not found or not approved/active' });
    }

    const hours = Math.max(1, parseInt(timer_hours) || 24);
    const expires_at = new Date(Date.now() + hours * 3600 * 1000).toISOString();
    const baseRow = {
      product_id,
      sale_price: parseFloat(sale_price),
      original_price: product.price,
      timer_hours: hours,
      expires_at,
      is_active: true,
    };

    // Try with campaign columns; fall back if migration 011 isn't applied yet.
    let { data, error } = await supabase
      .from('flash_sales')
      .insert({ ...baseRow, type, title: title || null, theme: theme || null })
      .select()
      .single();
    if (error && /type|title|theme|column/i.test(String(error.message || ''))) {
      ({ data, error } = await supabase.from('flash_sales').insert(baseRow).select().single());
    }
    if (error) throw error;
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/campaigns/:id — admin removes a campaign
router.delete('/:id', verifyToken, requireAdmin, async (req, res, next) => {
  try {
    const { error } = await supabase.from('flash_sales').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true, message: 'Campaign removed' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
