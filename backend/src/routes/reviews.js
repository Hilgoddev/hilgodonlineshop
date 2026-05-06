const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

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

// Create a review
router.post('/', async (req, res, next) => {
    try {
        const { product_id, product_name, name, email, rating, title, message } = req.body;

        if (!product_id || !name || !email || !message) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }

        const { data, error } = await supabase
            .from('reviews')
            .insert([{
                product_id,
                product_name,
                user_name: name,
                user_email: email,
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
