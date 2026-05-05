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
            .from('wishlist_items')
            .select('product:products(*)')
            .eq('user_id', req.user.id);
        if (error) throw error;
        const products = (data || []).map((row) => row.product).filter(Boolean).map(mapProduct);
        res.status(200).json({ success: true, data: products });
    } catch (err) {
        next(err);
    }
});

router.post('/', verifyToken, async (req, res, next) => {
    try {
        const productId = req.body.productId || req.body.product_id;
        if (!productId) return res.status(400).json({ success: false, error: 'productId is required' });

        const { error } = await supabase.from('wishlist_items').upsert({ user_id: req.user.id, product_id: productId });
        if (error) throw error;
        res.status(200).json({ success: true, message: 'Added to wishlist' });
    } catch (err) {
        next(err);
    }
});

router.delete('/', verifyToken, async (req, res, next) => {
    try {
        const productId = req.query.productId || req.body.productId;
        if (!productId) return res.status(400).json({ success: false, error: 'productId is required' });

        const { error } = await supabase
            .from('wishlist_items')
            .delete()
            .eq('user_id', req.user.id)
            .eq('product_id', productId);
        if (error) throw error;
        res.status(200).json({ success: true, message: 'Removed from wishlist' });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
