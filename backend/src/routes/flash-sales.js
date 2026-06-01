const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { verifyToken } = require('./auth');

const requireAdmin = async (req, res, next) => {
  try {
    const { data: profile, error } = await supabase.from('profiles').select('role').eq('id', req.user.id).single();
    if (error || !profile || profile.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }
    next();
  } catch (err) {
    next(err);
  }
};

// GET /api/flash-sales — public, only active non-expired sales
router.get('/', async (req, res) => {
  try {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('flash_sales')
      .select('*, products(*)')
      .eq('is_active', true)
      .gt('expires_at', now)
      .order('created_at', { ascending: false });
    if (error) return res.json({ success: true, data: [] });
    res.json({ success: true, data: data || [] });
  } catch {
    res.json({ success: true, data: [] });
  }
});

// GET /api/flash-sales/all — admin, all including expired
router.get('/all', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('flash_sales')
      .select('*, products(*)')
      .order('created_at', { ascending: false });
    if (error) return res.json({ success: true, data: [] });
    res.json({ success: true, data: data || [] });
  } catch {
    res.json({ success: true, data: [] });
  }
});

// POST /api/flash-sales — admin creates a flash sale
router.post('/', verifyToken, requireAdmin, async (req, res, next) => {
  try {
    const { product_id, sale_price, timer_hours = 24 } = req.body;
    if (!product_id || !sale_price) {
      return res.status(400).json({ success: false, error: 'product_id and sale_price are required' });
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

    const { data, error } = await supabase
      .from('flash_sales')
      .insert({
        product_id,
        sale_price: parseFloat(sale_price),
        original_price: product.price,
        timer_hours: hours,
        expires_at,
        is_active: true,
      })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/flash-sales/:id — admin removes a flash sale
router.delete('/:id', verifyToken, requireAdmin, async (req, res, next) => {
  try {
    const { error } = await supabase.from('flash_sales').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true, message: 'Flash sale removed' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
