const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { verifyToken } = require('./auth');

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
        const { data, error } = await supabase
            .from('categories')
            .select('*')
            .order('name', { ascending: true });
            
        if (error) throw error;
        res.status(200).json({ success: true, data });
    } catch (err) {
        next(err);
    }
});

// Create a new category (Admin only)
router.post('/', verifyToken, requireAdmin, async (req, res, next) => {
    try {
        const { name, slug, parent_id, is_active } = req.body;
        
        if (!name || !slug) {
            return res.status(400).json({ success: false, error: 'Name and slug are required' });
        }
        
        const { data, error } = await supabase
            .from('categories')
            .insert([{ name, slug, parent_id, is_active }])
            .select();
            
        if (error) throw error;
        res.status(201).json({ success: true, data: data[0] });
    } catch (err) {
        next(err);
    }
});

// Update a category (Admin only)
router.put('/:id', verifyToken, requireAdmin, async (req, res, next) => {
    try {
        const { name, slug, parent_id, is_active } = req.body;
        
        const { data, error } = await supabase
            .from('categories')
            .update({ name, slug, parent_id, is_active })
            .eq('id', req.params.id)
            .select();
            
        if (error) throw error;
        if (!data || data.length === 0) {
            return res.status(404).json({ success: false, error: 'Category not found' });
        }
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
        res.status(200).json({ success: true, message: 'Category deleted' });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
