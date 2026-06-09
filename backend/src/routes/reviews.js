const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { verifyToken } = require('./auth');
const { reviewLimiter } = require('../middleware/rateLimit');
const { isUuid } = require('../lib/validate');

// Recent reviews across all products (homepage testimonials + /reviews page).
// Defined BEFORE '/:productId' so "recent"/"overall" aren't treated as a product id.
router.get('/recent', async (req, res, next) => {
    try {
        const limit = Math.min(60, Math.max(1, Number(req.query.limit) || 12));
        const { data, error } = await supabase
            .from('reviews')
            .select('id, product_id, product_name, user_name, rating, title, message, created_at')
            .order('created_at', { ascending: false })
            .limit(limit);
        if (error) throw error;
        res.json({ success: true, data: data || [] });
    } catch (err) {
        next(err);
    }
});

// Site-wide rating summary (average + total count) for the footer badge.
router.get('/overall', async (req, res, next) => {
    try {
        const { data, error } = await supabase.from('reviews').select('rating');
        if (error) throw error;
        const ratings = (data || []).map((r) => Number(r.rating)).filter((n) => n >= 1 && n <= 5);
        const count = ratings.length;
        const average = count ? Number((ratings.reduce((a, b) => a + b, 0) / count).toFixed(2)) : 0;
        res.json({ success: true, data: { average, count } });
    } catch (err) {
        next(err);
    }
});

// Get reviews for a product
router.get('/:productId', async (req, res, next) => {
    try {
        const { productId } = req.params;
        // Malformed id → no reviews (avoids a 22P02 500 leaking the DB error).
        if (!isUuid(productId)) {
            return res.json({ success: true, data: [] });
        }
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
router.post('/', verifyToken, reviewLimiter, async (req, res, next) => {
    try {
        const { product_id, product_name, rating, title, message } = req.body;

        if (!product_id || !message) {
            return res.status(400).json({ success: false, error: 'product_id and message are required' });
        }

        // Rating must be an integer 1–5. Reject anything else (no silent default to 5).
        const parsedRating = Number(rating);
        if (!Number.isInteger(parsedRating) || parsedRating < 1 || parsedRating > 5) {
            return res.status(400).json({ success: false, error: 'rating must be an integer between 1 and 5' });
        }

        // Bound message length to prevent abuse / oversized rows.
        if (String(message).length > 2000) {
            return res.status(400).json({ success: false, error: 'message is too long (max 2000 characters)' });
        }

        // One review per user per product. Guards against review spam.
        const { data: existing } = await supabase
            .from('reviews')
            .select('id')
            .eq('product_id', product_id)
            .eq('user_email', req.user.email)
            .maybeSingle();
        if (existing) {
            return res.status(409).json({ success: false, error: 'You have already reviewed this product' });
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
                rating: parsedRating,
                title: title ? String(title).slice(0, 200) : null,
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
