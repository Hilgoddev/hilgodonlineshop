const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { verifyToken } = require('./auth');
const { withTimeout, makeCache, singleFlight } = require('../lib/resilience');
const storesAllCache = makeCache({ ttlMs: 30 * 1000 });
const storesFlight = singleFlight();

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

// Middleware to verify seller role
const requireSeller = async (req, res, next) => {
    try {
        const { data: profile, error } = await supabase.from('profiles').select('role').eq('id', req.user.id).single();
        if (error || !profile || !['admin', 'seller'].includes(profile.role)) {
            return res.status(403).json({ success: false, error: 'Seller or Admin access required' });
        }
        req.userRole = profile.role;
        next();
    } catch (err) {
        next(err);
    }
};

// Get all stores (Public) - Using 'stores' table
router.get('/', async (req, res, next) => {
    try {
        const { data: stores, error } = await supabase
            .from('stores')
            .select('id, name, slug, description, logo_url')
            .eq('status', 'approved');

        if (error) throw error;

        const data = (stores || []).map(s => ({
            id: s.id,
            name: s.name,
            slug: s.slug,
            description: s.description,
            logo_url: s.logo_url
        }));

        res.status(200).json({ success: true, data });
    } catch (err) {
        next(err);
    }
});

// Admin get all stores (including unapproved)
router.get('/all', verifyToken, requireAdmin, async (req, res, next) => {
    const cached = storesAllCache.get('all');
    if (cached && cached.fresh) return res.status(200).json(cached.value);

    try {
        const stores = await storesFlight('all', async () => {
            const { data, error } = await withTimeout(
                (signal) => supabase
                    .from('stores')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .abortSignal(signal),
                12 * 1000,
            );
            if (error) throw error;
            return data || [];
        });

        // Count products per store. Products link to a store via the store's
        // owner (products.seller_id === stores.owner_id), so tally by seller_id
        // and map back — one grouped query instead of N per-store queries.
        const ownerIds = [...new Set(stores.map((s) => s.owner_id).filter(Boolean))];
        const productCounts = new Map();
        if (ownerIds.length > 0) {
            try {
                const { data: prods } = await withTimeout(
                    (signal) => supabase
                        .from('products')
                        .select('seller_id')
                        .in('seller_id', ownerIds)
                        .abortSignal(signal),
                    12 * 1000,
                );
                (prods || []).forEach((p) => {
                    productCounts.set(p.seller_id, (productCounts.get(p.seller_id) || 0) + 1);
                });
            } catch (_) { /* non-fatal: counts fall back to 0 */ }
        }

        const data = stores.map((s) => ({
            id: s.id,
            name: s.name,
            slug: s.slug,
            status: s.status || (s.is_approved ? 'approved' : 'pending'),
            description: s.description,
            logo_url: s.logo_url,
            owner_id: s.owner_id,
            product_count: productCounts.get(s.owner_id) || 0,
            created_at: s.created_at,
            updated_at: s.updated_at,
        }));

        const payload = { success: true, data };
        storesAllCache.set('all', payload);
        return res.status(200).json(payload);
    } catch (err) {
        if (cached) return res.status(200).json({ ...cached.value, stale: true });
        console.error('stores /all failed:', err?.message || err);
        return res.status(503).json({ success: false, error: 'Stores temporarily unavailable' });
    }
});

// Get current seller/admin store profile
router.get('/me', verifyToken, requireSeller, async (req, res, next) => {
    try {
        let query = supabase
            .from('stores')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1);

        if (req.userRole === 'seller') {
            query = query.eq('owner_id', req.user.id);
        }

        const { data, error } = await query;
        if (error) throw error;
        res.status(200).json({ success: true, data: data?.[0] || null });
    } catch (err) {
        next(err);
    }
});

// Get store by slug
router.get('/:slug', async (req, res, next) => {
    try {
        const { data, error } = await supabase
            .from('stores')
            .select('id, name, slug, description, logo_url')
            .eq('slug', req.params.slug)
            .single();

        if (error) throw error;
        res.status(200).json({ success: true, data });
    } catch (err) {
        next(err);
    }
});

// Create a store (Seller only)
router.post('/', verifyToken, requireSeller, async (req, res, next) => {
    try {
        const { name, slug, description, logo_url } = req.body;

        // Check if seller already has a store
        const { data: existingStore } = await supabase
            .from('stores')
            .select('id')
            .eq('owner_id', req.user.id)
            .single();

        if (existingStore) {
            return res.status(400).json({ 
                success: false, 
                error: 'You already have a store. Please update it instead.' 
            });
        }

        const { data, error } = await supabase
            .from('stores')
            .insert([{ 
                owner_id: req.user.id, 
                name, 
                slug, 
                description, 
                logo_url,
                status: 'pending'
            }])
            .select();

        if (error) throw error;
        res.status(201).json({ success: true, data: data[0] });
    } catch (err) {
        next(err);
    }
});

// Update a store (Seller updates own, Admin updates any)
router.put('/:id', verifyToken, requireSeller, async (req, res, next) => {
    try {
        const { name, slug, description, logo_url } = req.body;

        let updateData = { name, slug, description, logo_url };

        let query = supabase.from('stores').update(updateData).eq('id', req.params.id);

        if (req.userRole === 'seller') {
            query = query.eq('owner_id', req.user.id);
        }

        const { data, error } = await query.select();

        if (error) throw error;
        if (!data || data.length === 0) {
            return res.status(404).json({ success: false, error: 'Store not found or access denied' });
        }
        res.status(200).json({ success: true, data: data[0] });
    } catch (err) {
        next(err);
    }
});

// PATCH store status (Admin only)
router.patch('/:id/status', verifyToken, requireAdmin, async (req, res, next) => {
    try {
        const { status } = req.body;
        if (!['pending', 'approved', 'rejected'].includes(status)) {
            return res.status(400).json({ success: false, error: 'Invalid status' });
        }

        const { data, error } = await supabase
            .from('stores')
            .update({ status })
            .eq('id', req.params.id)
            .select()
            .single();

        if (error) throw error;

        res.status(200).json({ success: true, data });
    } catch (err) {
        next(err);
    }
});

module.exports = router;