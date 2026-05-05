const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { verifyToken } = require('./auth');

const mapProduct = (p) => ({
  _id: p.id,
  id: p.id,
  name: p.name,
  price: Number(p.price || 0),
  images: p.images || [],
  category: p.category,
  stock: p.stock
});

router.get('/', verifyToken, async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('cart_items')
      .select('quantity, product:products(*)')
      .eq('user_id', req.user.id);
    if (error) throw error;

    const items = (data || [])
      .filter((row) => row.product)
      .map((row) => ({ product: mapProduct(row.product), quantity: row.quantity }));

    res.status(200).json({ success: true, data: items });
  } catch (err) {
    next(err);
  }
});

router.post('/', verifyToken, async (req, res, next) => {
  try {
    const productId = req.body.productId || req.body.product_id;
    const quantity = Math.max(1, Number(req.body.quantity || 1));
    if (!productId) return res.status(400).json({ success: false, error: 'productId is required' });

    const { data: existing } = await supabase
      .from('cart_items')
      .select('quantity')
      .eq('user_id', req.user.id)
      .eq('product_id', productId)
      .maybeSingle();

    const nextQty = (existing?.quantity || 0) + quantity;
    const { error } = await supabase
      .from('cart_items')
      .upsert({ user_id: req.user.id, product_id: productId, quantity: nextQty });
    if (error) throw error;

    res.status(200).json({ success: true, message: 'Cart updated' });
  } catch (err) {
    next(err);
  }
});

router.put('/', verifyToken, async (req, res, next) => {
  try {
    const productId = req.body.productId || req.body.product_id;
    const quantity = Math.max(1, Number(req.body.quantity || 1));
    if (!productId) return res.status(400).json({ success: false, error: 'productId is required' });

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
