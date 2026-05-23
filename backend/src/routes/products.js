const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { verifyToken } = require('./auth');

const mapProduct = (p) => ({
    ...p,
    _id: p.id,
    id: p.id,
    price: Number(p.price || 0),
    originalPrice: p.original_price ? Number(p.original_price) : null,
});

// GET /api/products
router.get('/', async (req, res, next) => {
    try {
        const { category, subcategory, search, seller_id, limit = 20, page = 1 } = req.query;
        const parsedLimit = Math.max(1, Number(limit) || 20);
        const parsedPage  = Math.max(1, Number(page)  || 1);

        let query = supabase
            .from('products')
            .select('*, store:stores(name, slug, status), category_ref:categories(name, slug)', { count: 'exact' })
            .eq('is_active', true)
            .eq('status', 'approved');

        if (category)    query = query.eq('category', category);
        if (subcategory) query = query.eq('subcategory', subcategory);
        if (seller_id)   query = query.eq('seller_id', seller_id);
        if (search)      query = query.ilike('name', `%${search}%`);

        const offset = (parsedPage - 1) * parsedLimit;
        query = query.range(offset, offset + parsedLimit - 1);

        const { data, error, count } = await query;
        if (error) throw error;

        const payload = {
            success: true,
            data: (data || []).map(mapProduct),
            meta: { total: count || 0, page: parsedPage, limit: parsedLimit },
            pagination: { total: count || 0, page: parsedPage, limit: parsedLimit, pages: Math.ceil((count || 0) / parsedLimit) }
        };

        res.setHeader('Cache-Control', 'private, no-cache, must-revalidate');
        res.status(200).json(payload);
    } catch (err) {
        next(err);
    }
});

// GET /api/products/all  (admin — never cached, shows all including inactive)
router.get('/all', verifyToken, async (req, res, next) => {
    try {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', req.user.id).single();
        if (!profile || profile.role !== 'admin') return res.status(403).json({ success: false, error: 'Admin access required' });

        const { limit = 1000 } = req.query;
        const { data, error, count } = await supabase
            .from('products')
            .select('*, store:stores(name, slug, status), category_ref:categories(name, slug)', { count: 'exact' })
            .order('created_at', { ascending: false })
            .limit(Number(limit));

        if (error) throw error;
        res.setHeader('Cache-Control', 'private, no-cache, must-revalidate');
        res.status(200).json({ success: true, data: (data || []).map(mapProduct), pagination: { total: count } });
    } catch (err) {
        next(err);
    }
});

// GET /api/products/:id
router.get('/:id', async (req, res, next) => {
    try {
        const { data, error } = await supabase
            .from('products')
            .select('*, store:stores(name, slug, logo_url), category_ref:categories(name, slug)')
            .eq('id', req.params.id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return res.status(404).json({ success: false, error: 'Product not found' });
            }
            throw error;
        }

        const payload = { success: true, data: mapProduct(data) };
        res.setHeader('Cache-Control', 'private, no-cache, must-revalidate');
        res.status(200).json(payload);
    } catch (err) {
        next(err);
    }
});

// Role check middleware
const verifySellerOrAdmin = async (req, res, next) => {
    try {
        const { data: profile, error } = await supabase.from('profiles').select('role').eq('id', req.user.id).single();
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

// POST /api/products
router.post('/', verifyToken, verifySellerOrAdmin, async (req, res, next) => {
    try {
        const { name, description, price, currency, category, subcategory, category_id, store_id, images, stock, brand, original_price, size_options, color_options } = req.body;
        const status = req.userRole === 'admin' ? 'approved' : 'pending';

        const insertData = {
            seller_id: req.user.id,
            store_id: store_id || null,
            name, description, price,
            currency: currency || 'NGN',
            category, subcategory,
            category_id: category_id || null,
            images, stock, status,
            is_active: true,
        };
        if (brand          !== undefined) insertData.brand          = brand || null;
        if (original_price !== undefined) insertData.original_price = original_price || null;
        if (size_options   !== undefined) insertData.size_options   = size_options || null;
        if (color_options  !== undefined) insertData.color_options  = color_options || null;

        const { data, error } = await supabase
            .from('products')
            .insert([insertData])
            .select();

        if (error) throw error;

        res.status(201).json({ success: true, data: mapProduct(data[0]) });
    } catch (err) {
        next(err);
    }
});

// PUT /api/products/:id — partial-update safe (only applies provided fields)
router.put('/:id', verifyToken, verifySellerOrAdmin, async (req, res, next) => {
    try {
        const { name, description, price, currency, category, subcategory, category_id, store_id, images, stock, is_active, brand, original_price, size_options, color_options } = req.body;

        const updateData = {};
        if (name           !== undefined) updateData.name           = name;
        if (description    !== undefined) updateData.description    = description;
        if (price          !== undefined) updateData.price          = price;
        if (currency       !== undefined) updateData.currency       = currency;
        if (category       !== undefined) updateData.category       = category;
        if (subcategory    !== undefined) updateData.subcategory    = subcategory;
        if (images         !== undefined) updateData.images         = images;
        if (stock          !== undefined) updateData.stock          = stock;
        if (category_id    !== undefined) updateData.category_id    = category_id;
        if (store_id       !== undefined) updateData.store_id       = store_id;
        if (brand          !== undefined) updateData.brand          = brand || null;
        if (original_price !== undefined) updateData.original_price = original_price || null;
        if (size_options   !== undefined) updateData.size_options   = size_options || null;
        if (color_options  !== undefined) updateData.color_options  = color_options || null;
        if (typeof is_active === 'boolean') updateData.is_active = is_active;

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ success: false, error: 'No fields to update' });
        }

        let updateQuery = supabase.from('products').update(updateData).eq('id', req.params.id);
        if (req.userRole === 'seller') updateQuery = updateQuery.eq('seller_id', req.user.id).eq('is_active', true);

        const { data, error } = await updateQuery.select('*');
        if (error) throw error;
        if (!data?.length) return res.status(404).json({ success: false, error: 'Product not found or access denied' });

        res.status(200).json({ success: true, data: mapProduct(data[0]) });
    } catch (err) {
        next(err);
    }
});

// DELETE /api/products/:id — hard delete
router.delete('/:id', verifyToken, verifySellerOrAdmin, async (req, res, next) => {
    try {
        let deleteQuery = supabase.from('products').delete().eq('id', req.params.id);
        if (req.userRole === 'seller') deleteQuery = deleteQuery.eq('seller_id', req.user.id);

        const { data, error } = await deleteQuery.select('*');
        if (error) {
            // FK violation: product is referenced by order history
            if (error.code === '23503') {
                return res.status(409).json({ success: false, error: 'Product has order history. Deactivate it instead of deleting.' });
            }
            throw error;
        }
        if (!data?.length) return res.status(404).json({ success: false, error: 'Product not found or access denied' });

        res.status(200).json({ success: true, message: 'Product deleted permanently' });
    } catch (err) {
        next(err);
    }
});

// PATCH /api/products/:id/status  (admin approve/reject)
router.patch('/:id/status', verifyToken, async (req, res, next) => {
    try {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', req.user.id).single();
        if (!profile || profile.role !== 'admin') return res.status(403).json({ success: false, error: 'Admin access required' });

        const { status } = req.body;
        if (!['pending', 'approved', 'rejected'].includes(status)) {
            return res.status(400).json({ success: false, error: 'Invalid status' });
        }

        const { data, error } = await supabase.from('products').update({ status }).eq('id', req.params.id).select().single();
        if (error) throw error;

        res.status(200).json({ success: true, data });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
