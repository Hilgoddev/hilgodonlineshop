const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { verifyToken } = require('./auth');
const { getActiveFlashSaleMap, getEffectiveProductPricing } = require('../utils/pricing');

// Strictly parse a cart quantity: must be a finite positive integer.
// Returns null for invalid input (e.g. "abc" → NaN, which previously slipped
// through Math.max(1, NaN) === NaN and corrupted the cart row).
const MAX_QTY = 99;
const parseQuantity = (raw, { defaultTo1 = true } = {}) => {
  if ((raw === undefined || raw === null || raw === '') && defaultTo1) return 1;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1) return null;
  return Math.min(n, MAX_QTY);
};

const mapProduct = (p, flashSale = null) => {
  const pricing = getEffectiveProductPricing(p, flashSale);
  return {
    _id: p.id,
    id: p.id,
    name: p.name,
    price: pricing.price,
    originalPrice: pricing.originalPrice,
    images: p.images || [],
    category: p.category,
    stock: p.stock
  };
};

router.get('/', verifyToken, async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('cart_items')
      .select('quantity, product:products(*)')
      .eq('user_id', req.user.id);
    if (error) throw error;

    const flashSaleMap = await getActiveFlashSaleMap((data || []).map((row) => row.product?.id));

    const items = (data || [])
      .filter((row) => row.product)
      .map((row) => ({ product: mapProduct(row.product, flashSaleMap.get(row.product.id)), quantity: row.quantity }));

    res.status(200).json({ success: true, data: items });
  } catch (err) {
    next(err);
  }
});

router.post('/', verifyToken, async (req, res, next) => {
  try {
    const productId = req.body.productId || req.body.product_id;
    if (!productId || typeof productId !== 'string') return res.status(400).json({ success: false, error: 'productId is required' });
    const quantity = parseQuantity(req.body.quantity);
    if (quantity === null) return res.status(400).json({ success: false, error: 'quantity must be a positive integer' });

    const { data: existing } = await supabase
      .from('cart_items')
      .select('quantity')
      .eq('user_id', req.user.id)
      .eq('product_id', productId)
      .maybeSingle();

    const nextQty = Math.min((existing?.quantity || 0) + quantity, MAX_QTY);
    const { error } = await supabase
      .from('cart_items')
      .upsert({ user_id: req.user.id, product_id: productId, quantity: nextQty }, { onConflict: 'user_id,product_id' });
    if (error) throw error;

    res.status(200).json({ success: true, message: 'Cart updated' });
  } catch (err) {
    next(err);
  }
});

router.put('/', verifyToken, async (req, res, next) => {
  try {
    const productId = req.body.productId || req.body.product_id;
    if (!productId || typeof productId !== 'string') return res.status(400).json({ success: false, error: 'productId is required' });
    const quantity = parseQuantity(req.body.quantity, { defaultTo1: false });
    if (quantity === null) return res.status(400).json({ success: false, error: 'quantity must be a positive integer' });

    const { error } = await supabase
      .from('cart_items')
      .update({ quantity })
      .eq('user_id', req.user.id)
      .eq('product_id', productId);
    if (error) throw error;

    res.status(200).json({ success: true, message: 'Quantity updated' });
  } catch (err) {
    next(err);
  }
});

router.delete('/', verifyToken, async (req, res, next) => {
  try {
    const productId = req.query.productId || req.body.productId;
    if (!productId) return res.status(400).json({ success: false, error: 'productId is required' });

    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('user_id', req.user.id)
      .eq('product_id', productId);
    if (error) throw error;

    res.status(200).json({ success: true, message: 'Removed from cart' });
  } catch (err) {
    next(err);
  }
});

router.delete('/clear', verifyToken, async (req, res, next) => {
  try {
    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('user_id', req.user.id);
    if (error) throw error;
    res.status(200).json({ success: true, message: 'Cart cleared' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
