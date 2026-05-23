const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { verifyToken } = require('./auth');

// Get reviews for a product
router.get('/:productId', async (req, res, next) => {
    try {
        const { productId } = req.params;
        const { data, error } = await supabase
            .from('reviews')
            .select('*')
            .eq('product_id', productId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.json({ success: true, data });
    } catch (err) {
        next(err);
    }
});

// Create a review — requires authentication; name/email sourced from verified profile
router.post('/', verifyToken, async (req, res, next) => {
    try {
        const { product_id, product_name, rating, title, message } = req.body;

        if (!product_id || !message) {
            return res.status(400).json({ success: false, error: 'product_id and message are required' });
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, username')
            .eq('id', req.user.id)
            .single();

        const { data, error } = await supabase
            .from('reviews')
            .insert([{
                product_id,
                product_name,
                user_name: profile?.full_name || req.user.email || 'Customer',
                user_email: req.user.email,
                rating: parseInt(rating) || 5,
                title,
                message
            }])
            .select()
            .single();

        if (error) throw error;

        res.status(201).json({ success: true, data });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
