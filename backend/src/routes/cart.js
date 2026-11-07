const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { verifyToken } = require('./auth');
const { getActiveFlashSaleMap, getEffectiveProductPricing } = require('../utils/pricing');
const { resolveOptionsForProduct, variantKey } = require('../lib/variants');

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
    currency: p.currency,
    images: p.images || [],
    category: p.category,
    stock: p.stock,
    size_options: p.size_options || null,
    color_options: p.color_options || null,
    color_images: p.color_images || null,
  };
};

// Before migration 022 cart_items has no variant columns: one line per product.
const isLegacySchema = (error) => !!error && String(error.message || '').includes('variant_key');

// Each cart line is (user, product, variant_key) — the same product can sit in
// the cart once per colour/size. Legacy rows have variant_key ''.
const lineFilter = (query, userId, productId, key) =>
  query.eq('user_id', userId).eq('product_id', productId).eq('variant_key', key);

async function loadProductForOptions(productId) {
  const { data, error } = await supabase
    .from('products')
    .select('id, name, size_options, color_options')
    .eq('id', productId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

router.get('/', verifyToken, async (req, res, next) => {
  try {
    let { data, error } = await supabase
      .from('cart_items')
      .select('quantity, variant_key, selected_options, product:products(*)')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: true });
    if (isLegacySchema(error)) {
      ({ data, error } = await supabase
        .from('cart_items')
        .select('quantity, product:products(*)')
        .eq('user_id', req.user.id));
    }
    if (error) throw error;

    const flashSaleMap = await getActiveFlashSaleMap((data || []).map((row) => row.product?.id));

    const items = (data || [])
      .filter((row) => row.product)
      .map((row) => ({
        product: mapProduct(row.product, flashSaleMap.get(row.product.id)),
        quantity: row.quantity,
        options: row.selected_options || null,
        variantKey: row.variant_key || '',
      }));

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

    const product = await loadProductForOptions(productId);
    if (!product) return res.status(404).json({ success: false, error: 'Product not found' });
    const { options, error: optionsError } = resolveOptionsForProduct(product, req.body.selectedOptions || req.body.selected_options);
    if (optionsError) return res.status(400).json({ success: false, error: optionsError, code: 'OPTIONS_REQUIRED' });
    const key = variantKey(options);

    const { data: existing, error: findErr } = await lineFilter(
      supabase.from('cart_items').select('id, quantity'), req.user.id, productId, key,
    ).maybeSingle();

    if (isLegacySchema(findErr)) {
      const { data: legacy } = await supabase
        .from('cart_items').select('quantity').eq('user_id', req.user.id).eq('product_id', productId).maybeSingle();
      const { error } = await supabase
        .from('cart_items')
        .upsert({ user_id: req.user.id, product_id: productId, quantity: Math.min((legacy?.quantity || 0) + quantity, MAX_QTY) }, { onConflict: 'user_id,product_id' });
      if (error) throw error;
      return res.status(200).json({ success: true, message: 'Cart updated' });
    }
    if (findErr) throw findErr;

    const { error } = existing
      ? await supabase.from('cart_items').update({ quantity: Math.min(existing.quantity + quantity, MAX_QTY) }).eq('id', existing.id)
      : await supabase.from('cart_items').insert({
          user_id: req.user.id, product_id: productId, quantity, variant_key: key, selected_options: options,
        });
    if (error) throw error;

    res.status(200).json({ success: true, message: 'Cart updated', variantKey: key });
  } catch (err) {
    next(err);
  }
});

// PUT — change a line's quantity and/or its options (e.g. pick the colour for a
// line that has none). Changing options onto a line that already exists merges them.
router.put('/', verifyToken, async (req, res, next) => {
  try {
    const productId = req.body.productId || req.body.product_id;
    if (!productId || typeof productId !== 'string') return res.status(400).json({ success: false, error: 'productId is required' });
    const key = typeof req.body.variantKey === 'string' ? req.body.variantKey : '';
    const hasQty = req.body.quantity !== undefined;
    const quantity = hasQty ? parseQuantity(req.body.quantity, { defaultTo1: false }) : undefined;
    if (hasQty && quantity === null) return res.status(400).json({ success: false, error: 'quantity must be a positive integer' });
    const newRawOptions = req.body.selectedOptions || req.body.selected_options;

    if (!newRawOptions) {
      if (!hasQty) return res.status(400).json({ success: false, error: 'Nothing to update' });
      let { error } = await lineFilter(supabase.from('cart_items').update({ quantity }), req.user.id, productId, key);
      if (isLegacySchema(error)) {
        ({ error } = await supabase.from('cart_items').update({ quantity }).eq('user_id', req.user.id).eq('product_id', productId));
      }
      if (error) throw error;
      return res.status(200).json({ success: true, message: 'Quantity updated' });
    }

    const product = await loadProductForOptions(productId);
    if (!product) return res.status(404).json({ success: false, error: 'Product not found' });
    const { options, error: optionsError } = resolveOptionsForProduct(product, newRawOptions);
    if (optionsError) return res.status(400).json({ success: false, error: optionsError, code: 'OPTIONS_REQUIRED' });
    const newKey = variantKey(options);

    const { data: line, error: lineErr } = await lineFilter(
      supabase.from('cart_items').select('id, quantity'), req.user.id, productId, key,
    ).maybeSingle();
    if (isLegacySchema(lineErr)) {
      return res.status(409).json({ success: false, error: 'Cart options are not available yet. Please try again shortly.' });
    }
    if (lineErr) throw lineErr;
    if (!line) return res.status(404).json({ success: false, error: 'Cart item not found' });
    const lineQty = hasQty ? quantity : line.quantity;

    if (newKey === key) {
      const { error } = await supabase.from('cart_items').update({ quantity: lineQty, selected_options: options }).eq('id', line.id);
      if (error) throw error;
    } else {
      const { data: target, error: targetErr } = await lineFilter(
        supabase.from('cart_items').select('id, quantity'), req.user.id, productId, newKey,
      ).maybeSingle();
      if (targetErr) throw targetErr;
      if (target) {
        const { error } = await supabase.from('cart_items').update({ quantity: Math.min(target.quantity + lineQty, MAX_QTY) }).eq('id', target.id);
        if (error) throw error;
        const { error: delErr } = await supabase.from('cart_items').delete().eq('id', line.id);
        if (delErr) throw delErr;
      } else {
        const { error } = await supabase
          .from('cart_items')
          .update({ quantity: lineQty, variant_key: newKey, selected_options: options })
          .eq('id', line.id);
        if (error) throw error;
      }
    }

    res.status(200).json({ success: true, message: 'Cart updated', variantKey: newKey });
  } catch (err) {
    next(err);
  }
});

// DELETE ?productId=…&variantKey=… removes one line; without variantKey it
// removes every line of that product.
router.delete('/', verifyToken, async (req, res, next) => {
  try {
    const productId = req.query.productId || req.body?.productId;
    if (!productId) return res.status(400).json({ success: false, error: 'productId is required' });
    const key = req.query.variantKey ?? req.body?.variantKey;

    let query = supabase.from('cart_items').delete().eq('user_id', req.user.id).eq('product_id', productId);
    if (typeof key === 'string') query = query.eq('variant_key', key);
    let { error } = await query;
    if (isLegacySchema(error)) {
      ({ error } = await supabase.from('cart_items').delete().eq('user_id', req.user.id).eq('product_id', productId));
    }
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
