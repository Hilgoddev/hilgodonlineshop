const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { verifyToken } = require('./auth');
const cache = require('../utils/cache');

const PRODUCTS_LIST_TTL  = 2 * 60 * 1000; // 2 minutes
const PRODUCT_DETAIL_TTL = 5 * 60 * 1000; // 5 minutes

const mapProduct = (p) => ({
    ...p,
    _id: p.id,
    id: p.id,
    price: Number(p.price || 0)
});

// GET /api/products
router.get('/', async (req, res, next) => {
    try {
        const { category, search, seller_id, limit = 20, page = 1 } = req.query;
        const parsedLimit = Math.max(1, Number(limit) || 20);
        const parsedPage  = Math.max(1, Number(page)  || 1);

        const cacheKey = `products:list:${JSON.stringify({ category, search, seller_id, limit: parsedLimit, page: parsedPage })}`;
        const cached = cache.get(cacheKey);
        if (cached) {
            res.setHeader('X-Cache', 'HIT');
            res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=120');
            return res.status(200).json(cached);
        }

        let query = supabase
            .from('products')
            .select('*, store:stores(name, slug, status), category_ref:categories(name, slug)', { count: 'exact' })
            .eq('is_active', true)
            .eq('status', 'approved');

        if (category)   query = query.eq('category', category);
        if (seller_id)  query = query.eq('seller_id', seller_id);
        if (search)     query = query.ilike('name', `%${search}%`);

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

        cache.set(cacheKey, payload, PRODUCTS_LIST_TTL);
        res.setHeader('X-Cache', 'MISS');
        res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=120');
        res.status(200).json(payload);
    } catch (err) {
        next(err);
    }
});

// GET /api/products/all  (admin — never cached)
router.get('/all', verifyToken, async (req, res, next) => {
    try {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', req.user.id).single();
        if (!profile || profile.role !== 'admin') return res.status(403).json({ success: false, error: 'Admin access required' });

        const { limit = 1000 } = req.query;
        const { data, error, count } = await supabase
            .from('products')
            .select('*, store:stores(name, slug, status), category_ref:categories(name, slug)', { count: 'exact' })
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(Number(limit));

        if (error) throw error;
        res.status(200).json({ success: true, data: (data || []).map(mapProduct), pagination: { total: count } });
    } catch (err) {
        next(err);
    }
});

// GET /api/products/:id
router.get('/:id', async (req, res, next) => {
    try {
        const cacheKey = `products:detail:${req.params.id}`;
        const cached = cache.get(cacheKey);
        if (cached) {
            res.setHeader('X-Cache', 'HIT');
            res.setHeader('Cache-Control', 'public, max-age=180, stale-while-revalidate=300');
            return res.status(200).json(cached);
        }

        const { data, error } = await supabase
            .from('products')
            .select('*, store:stores(name, slug, logo_url), category_ref:categories(name, slug)')
            .eq('id', req.params.id)
            .single();

        if (error) throw error;

        const payload = { success: true, data: mapProduct(data) };
        cache.set(cacheKey, payload, PRODUCT_DETAIL_TTL);
        res.setHeader('X-Cache', 'MISS');
        res.setHeader('Cache-Control', 'public, max-age=180, stale-while-revalidate=300');
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
        const { name, description, price, category, subcategory, category_id, store_id, images, stock } = req.body;
        const status = req.userRole === 'admin' ? 'approved' : 'pending';

        const { data, error } = await supabase
            .from('products')
            .insert([{ seller_id: req.user.id, store_id: store_id || null, name, description, price, category, subcategory, category_id: category_id || null, images, stock, status }])
            .select();

        if (error) throw error;

        // New product might appear in any list query
        cache.invalidatePrefix('products:list:');

        res.status(201).json({ success: true, data: mapProduct(data[0]) });
    } catch (err) {
        next(err);
    }
});

// PUT /api/products/:id
router.put('/:id', verifyToken, verifySellerOrAdmin, async (req, res, next) => {
    try {
        const { name, description, price, category, subcategory, category_id, store_id, images, stock, is_active } = req.body;

        let updateData = { name, description, price, category, subcategory, images, stock, ...(typeof is_active === 'boolean' ? { is_active } : {}) };
        if (category_id !== undefined) updateData.category_id = category_id;
        if (store_id !== undefined)    updateData.store_id    = store_id;

        let updateQuery = supabase.from('products').update(updateData).eq('id', req.params.id).eq('is_active', true);
        if (req.userRole === 'seller') updateQuery = updateQuery.eq('seller_id', req.user.id);

        const { data, error } = await updateQuery.select('*');
        if (error) throw error;
        if (!data?.length) return res.status(404).json({ success: false, error: 'Product not found or access denied' });

        cache.del(`products:detail:${req.params.id}`);
        cache.invalidatePrefix('products:list:');

        res.status(200).json({ success: true, data: mapProduct(data[0]) });
    } catch (err) {
        next(err);
    }
});

// DELETE /api/products/:id
router.delete('/:id', verifyToken, verifySellerOrAdmin, async (req, res, next) => {
    try {
        let deleteQuery = supabase.from('products').update({ is_active: false }).eq('id', req.params.id);
        if (req.userRole === 'seller') deleteQuery = deleteQuery.eq('seller_id', req.user.id);

        const { data, error } = await deleteQuery.select('*');
        if (error) throw error;
        if (!data?.length) return res.status(404).json({ success: false, error: 'Product not found or access denied' });

        cache.del(`products:detail:${req.params.id}`);
        cache.invalidatePrefix('products:list:');

        res.status(200).json({ success: true, message: 'Product removed successfully' });
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

        cache.del(`products:detail:${req.params.id}`);
        cache.invalidatePrefix('products:list:');

        res.status(200).json({ success: true, data });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
