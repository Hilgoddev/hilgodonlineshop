const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { verifyToken } = require('./auth');

let categoriesCache = null;
let cacheExpiry = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const FALLBACK_CATEGORIES = [
    { name: 'Accessories', slug: 'accessories', icon: 'fa-glasses' },
    { name: 'Beauty & Care', slug: 'beauty', icon: 'fa-sparkles' },
    { name: 'Electronics', slug: 'electronics', icon: 'fa-mobile-screen' },
    { name: 'Gaming', slug: 'gaming', icon: 'fa-gamepad' },
    { name: 'Herbs', slug: 'herbs', icon: 'fa-leaf' },
    { name: 'Home Supplies', slug: 'home', icon: 'fa-house' },
    { name: 'Kitchenware', slug: 'kitchen', icon: 'fa-kitchen-set' },
    { name: 'Menswear', slug: 'menswear', icon: 'fa-person' },
    { name: 'Shoes', slug: 'shoes', icon: 'fa-shoe-prints' },
    { name: 'Sports', slug: 'sports', icon: 'fa-basketball' },
    { name: 'Toys', slug: 'toys', icon: 'fa-child' },
    { name: 'Womenswear', slug: 'womenswear', icon: 'fa-person-dress' },
];

// Middleware to verify admin role
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

// Get all categories (Public)
router.get('/', async (req, res, next) => {
    try {
        const now = Date.now();
        if (categoriesCache && now < cacheExpiry) {
            res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=60');
            return res.status(200).json({ success: true, data: categoriesCache, cached: true });
        }
        const { data, error } = await supabase
            .from('categories')
            .select('*')
            .order('name', { ascending: true });
        if (error) {
            console.warn('[CATEGORIES] Falling back to static categories:', error.message);
            categoriesCache = FALLBACK_CATEGORIES;
            cacheExpiry = now + CACHE_TTL;
            res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=60');
            return res.status(200).json({ success: true, data: FALLBACK_CATEGORIES, fallback: true });
        }
        categoriesCache = data && data.length ? data : FALLBACK_CATEGORIES;
        cacheExpiry = now + CACHE_TTL;
        res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=60');
        res.status(200).json({ success: true, data: categoriesCache });
    } catch (err) {
        console.warn('[CATEGORIES] Unhandled error, returning fallback:', err.message);
        categoriesCache = FALLBACK_CATEGORIES;
        cacheExpiry = Date.now() + CACHE_TTL;
        res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=60');
        res.status(200).json({ success: true, data: FALLBACK_CATEGORIES, fallback: true });
    }
});

// Create a new category (Admin only)
router.post('/', verifyToken, requireAdmin, async (req, res, next) => {
    try {
        const { name, slug, parent_id, is_active, image_url } = req.body;

        if (!name || !slug) {
            return res.status(400).json({ success: false, error: 'Name and slug are required' });
        }

        const { data, error } = await supabase
            .from('categories')
            .insert([{ name, slug, parent_id, is_active, image_url: image_url || null }])
            .select();
            
        if (error) throw error;
        categoriesCache = null;
        res.status(201).json({ success: true, data: data[0] });
    } catch (err) {
        next(err);
    }
});

// Update a category (Admin only)
router.put('/:id', verifyToken, requireAdmin, async (req, res, next) => {
    try {
        const { name, slug, parent_id, is_active, image_url } = req.body;

        const updatePayload = { name, slug, parent_id, is_active };
        if (image_url !== undefined) updatePayload.image_url = image_url;

        const { data, error } = await supabase
            .from('categories')
            .update(updatePayload)
            .eq('id', req.params.id)
            .select();
            
        if (error) throw error;
        if (!data || data.length === 0) {
            return res.status(404).json({ success: false, error: 'Category not found' });
        }
        categoriesCache = null;
        res.status(200).json({ success: true, data: data[0] });
    } catch (err) {
        next(err);
    }
});

// Delete a category (Admin only)
router.delete('/:id', verifyToken, requireAdmin, async (req, res, next) => {
    try {
        const { data, error } = await supabase
            .from('categories')
            .delete()
            .eq('id', req.params.id)
            .select();
            
        if (error) throw error;
        if (!data || data.length === 0) {
            return res.status(404).json({ success: false, error: 'Category not found' });
        }
        categoriesCache = null;
        res.status(200).json({ success: true, message: 'Category deleted' });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
