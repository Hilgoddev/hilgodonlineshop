const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { verifyToken } = require('./auth');

const mapProduct = (p) => ({
    ...p,
    _id: p.id,
    id: p.id,
    price: Number(p.price || 0)
});

// Get all active products
router.get('/', async (req, res, next) => {
    try {
        const { category, search, seller_id, limit = 20, page = 1 } = req.query;
        const parsedLimit = Math.max(1, Number(limit) || 20);
        const parsedPage = Math.max(1, Number(page) || 1);

        let query = supabase
            .from('products')
            .select('*', { count: 'exact' })
            .eq('is_active', true);
        
        if (category) {
            query = query.eq('category', category);
        }
        if (seller_id) {
            query = query.eq('seller_id', seller_id);
        }
        if (search) {
            query = query.ilike('name', `%${search}%`);
        }
        
        const offset = (parsedPage - 1) * parsedLimit;
        query = query.range(offset, offset + parsedLimit - 1);
        
        const { data, error, count } = await query;
        
        if (error) throw error;
        
        const mapped = (data || []).map(mapProduct);
        const pagination = { total: count || 0, page: parsedPage, limit: parsedLimit };
        res.status(200).json({
            success: true, 
            data: mapped,
            meta: pagination,
            pagination
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
        
        res.status(200).json({ success: true, data: mapProduct(data) });
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
        
        res.status(201).json({ success: true, data: mapProduct(data[0]) });
    } catch (err) {
        next(err);
    }
});

// Update a product (Protected: Seller/Admin; seller can only update own)
router.put('/:id', verifyToken, verifySellerOrAdmin, async (req, res, next) => {
    try {
        const { name, description, price, category, subcategory, images, stock, is_active } = req.body;
        let updateQuery = supabase
            .from('products')
            .update({
                name,
                description,
                price,
                category,
                subcategory,
                images,
                stock,
                ...(typeof is_active === 'boolean' ? { is_active } : {})
            })
            .eq('id', req.params.id);

        if (req.userRole === 'seller') {
            updateQuery = updateQuery.eq('seller_id', req.user.id);
        }

        const { data, error } = await updateQuery.select('*');
        if (error) throw error;
        if (!data?.length) {
            return res.status(404).json({ success: false, error: 'Product not found or access denied' });
        }

        res.status(200).json({ success: true, data: mapProduct(data[0]) });
    } catch (err) {
        next(err);
    }
});

// Delete product (soft-delete by setting inactive)
router.delete('/:id', verifyToken, verifySellerOrAdmin, async (req, res, next) => {
    try {
        let deleteQuery = supabase
            .from('products')
            .update({ is_active: false })
            .eq('id', req.params.id);

        if (req.userRole === 'seller') {
            deleteQuery = deleteQuery.eq('seller_id', req.user.id);
        }

        const { data, error } = await deleteQuery.select('*');
        if (error) throw error;
        if (!data?.length) {
            return res.status(404).json({ success: false, error: 'Product not found or access denied' });
        }

        res.status(200).json({ success: true, message: 'Product removed successfully' });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
