const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { verifyToken } = require('./auth');
const { getActiveFlashSaleMap, getEffectiveProductPricing } = require('../utils/pricing');

router.get('/', verifyToken, async (req, res, next) => {
    try {
        const { data, error } = await supabase
            .from('wishlist_items')
            .select('product:products(*)')
            .eq('user_id', req.user.id);
        if (error) throw error;
        const products = (data || []).map((row) => row.product).filter(Boolean);
        const saleMap = await getActiveFlashSaleMap(products.map((p) => p.id));
        const mappedProducts = products.map((product) => {
            const pricing = getEffectiveProductPricing(product, saleMap.get(product.id));
            return {
                ...product,
                _id: product.id,
                id: product.id,
                price: pricing.price,
                originalPrice: pricing.originalPrice,
            };
        });
        res.status(200).json({ success: true, data: mappedProducts });
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
