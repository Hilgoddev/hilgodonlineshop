const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { verifyToken } = require('./auth');

// Get all active products
router.get('/', async (req, res, next) => {
    try {
        const { category, limit = 20, page = 1 } = req.query;
        let query = supabase.from('products').select('*').eq('is_active', true);
        
        if (category) {
            query = query.eq('category', category);
        }
        
        const offset = (page - 1) * limit;
        query = query.range(offset, offset + limit - 1);
        
        const { data, error, count } = await query;
        
        if (error) throw error;
        
        res.status(200).json({ 
            success: true, 
            data,
            meta: { total: count, page: parseInt(page), limit: parseInt(limit) }
        });
    } catch (err) {
        next(err);
    }
});

// Get single product by ID
router.get('/:id', async (req, res, next) => {
    try {
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('id', req.params.id)
            .single();
            
        if (error) throw error;
        
        res.status(200).json({ success: true, data });
    } catch (err) {
        next(err);
    }
});

// Middleware to verify seller or admin role
const verifySellerOrAdmin = async (req, res, next) => {
    try {
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', req.user.id)
            .single();
            
        if (error || !profile) throw error;
        
        if (profile.role !== 'seller' && profile.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Forbidden. Seller or Admin access required.' });
        }
        
        req.userRole = profile.role;
        next();
    } catch (err) {
        next(err);
    }
};

// Create a new product (Protected: Seller/Admin only)
router.post('/', verifyToken, verifySellerOrAdmin, async (req, res, next) => {
    try {
        const { name, description, price, category, subcategory, images, stock } = req.body;
        
        const { data, error } = await supabase
            .from('products')
            .insert([{
                seller_id: req.user.id,
                name,
                description,
                price,
                category,
                subcategory,
                images,
                stock
            }])
            .select();
            
        if (error) throw error;
        
        res.status(201).json({ success: true, data: data[0] });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
