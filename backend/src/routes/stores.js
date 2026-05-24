const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { verifyToken } = require('./auth');

// Middleware to verify admin role
const requireAdmin = async (req, res, next) => {
    try {
        console.log('[stores.js requireAdmin] Checking admin status for user:', req.user?.id);
        const { data: profile, error } = await supabase.from('profiles').select('role').eq('id', req.user.id).single();
        console.log('[stores.js requireAdmin] Profile query result:', { data: profile, error });
        if (error || !profile || profile.role !== 'admin') {
            console.log('[stores.js requireAdmin] Admin check failed:', { error, profile });
            return res.status(403).json({ success: false, error: 'Admin access required' });
        }
        console.log('[stores.js requireAdmin] Admin check passed');
        next();
    } catch (err) {
        console.error('[stores.js requireAdmin] Error:', err);
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

// Get all stores (Public)
router.get('/', async (req, res, next) => {
    try {
        const { data: storefronts, error } = await supabase
            .from('storefronts')
            .select('id, store_name, slug, description, logo_url, is_active')
            .eq('is_active', true);

        if (error) throw error;

        const data = (storefronts || []).map(s => ({
            id: s.id,
            name: s.store_name,
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
    try {
        console.log('[stores.js /all] Admin check passed, fetching storefronts...');
        const { data: storefronts, error } = await supabase
            .from('storefronts')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('[stores.js /all] Supabase error:', error);
            throw error;
        }

        console.log('[stores.js /all] Storefronts fetched:', storefronts?.length || 0, 'records');

        const data = (storefronts || []).map(s => ({
            id: s.id,
            name: s.store_name,
            slug: s.slug,
            status: s.is_active ? 'approved' : 'pending',
            description: s.description,
            logo_url: s.logo_url,
            seller_id: s.seller_id,
            created_at: s.created_at
        }));

        console.log('[stores.js /all] Mapped data, sending response');
        res.status(200).json({ success: true, data });
    } catch (err) {
        console.error('[stores.js /all] Error:', err.message, err);
        next(err);
    }
});

// Get current seller/admin store profile
router.get('/me', verifyToken, requireSeller, async (req, res, next) => {
    try {
        let query = supabase
            .from('storefronts')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1);

        if (req.userRole === 'seller') {
            query = query.eq('seller_id', req.user.id);
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
            .from('storefronts')
            .select('id, store_name, slug, description, logo_url, is_active')
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
        const { store_name, slug, description, logo_url } = req.body;

        const { data, error } = await supabase
            .from('storefronts')
            .insert([{ seller_id: req.user.id, store_name, slug, description, logo_url, is_active: true }])
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
        const { store_name, slug, description, logo_url } = req.body;

        let updateData = { store_name, slug, description, logo_url };

        let query = supabase.from('storefronts').update(updateData).eq('id', req.params.id);

        if (req.userRole === 'seller') {
            query = query.eq('seller_id', req.user.id);
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
        if (!['pending', 'approved', 'rejected', 'active'].includes(status)) {
            return res.status(400).json({ success: false, error: 'Invalid status' });
        }

        const { data, error } = await supabase
            .from('storefronts')
            .update({ is_active: status === 'active' || status === 'approved' })
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
