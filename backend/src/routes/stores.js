const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { verifyToken } = require('./auth');
const { withTimeout, makeCache, singleFlight } = require('../lib/resilience');
const { REVENUE_STATUSES } = require('../lib/orderStatus');
const requireAdmin = require('../middleware/requireAdmin');
const storesAllCache = makeCache({ ttlMs: 30 * 1000 });
const storesFlight = singleFlight();

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

        // Calculate sales (distinct paid orders), units, and revenue per store.
        // supabase-js has no SQL join, so do it in two steps: fetch this owner's
        // order items, then keep only those in paid/shipped/delivered orders.
        const salesData = new Map();
        if (ownerIds.length > 0) {
            try {
                const { data: orderItems } = await withTimeout(
                    (signal) => supabase
                        .from('order_items')
                        .select('order_id, seller_id, quantity, unit_price')
                        .in('seller_id', ownerIds)
                        .abortSignal(signal),
                    12 * 1000,
                );

                const orderIds = [...new Set((orderItems || []).map((i) => i.order_id).filter(Boolean))];
                let paidSet = new Set();
                if (orderIds.length > 0) {
                    const { data: paidOrders } = await withTimeout(
                        (signal) => supabase
                            .from('orders')
                            .select('id')
                            .in('id', orderIds)
                            .in('status', REVENUE_STATUSES)
                            .abortSignal(signal),
                        12 * 1000,
                    );
                    paidSet = new Set((paidOrders || []).map((o) => o.id));
                }

                for (const item of orderItems || []) {
                    if (!paidSet.has(item.order_id)) continue;
                    const sellerId = item.seller_id;
                    if (!salesData.has(sellerId)) {
                        salesData.set(sellerId, { orders: new Set(), total_units: 0, total_revenue: 0 });
                    }
                    const current = salesData.get(sellerId);
                    current.orders.add(item.order_id);
                    current.total_units += Number(item.quantity) || 0;
                    current.total_revenue += (Number(item.unit_price) || 0) * (Number(item.quantity) || 0);
                }
            } catch (error) {
                console.error('Error calculating sales data:', error);
                // Non-fatal: stores fall back to zeroed metrics below.
            }
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
            total_sales: ((salesData.get(s.owner_id) || {}).orders || new Set()).size || 0,
            total_units: (salesData.get(s.owner_id) || {}).total_units || 0,
            total_revenue: (salesData.get(s.owner_id) || {}).total_revenue || 0,
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

// Get store by slug (public storefront). Returns owner_id so the storefront
// can list the store's products via /api/products?seller_id=<owner_id>.
router.get('/:slug', async (req, res, next) => {
    try {
        const { data, error } = await supabase
            .from('stores')
            .select('id, name, slug, description, logo_url, owner_id, status')
            .eq('slug', req.params.slug)
            .maybeSingle();

        if (error) throw error;
        if (!data) return res.status(404).json({ success: false, error: 'Store not found' });
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

        if (!name || !String(name).trim()) {
            return res.status(400).json({ success: false, error: 'Store name is required' });
        }
        // Enforce unique store name (case-insensitive) — two stores can't share a name.
        const { data: nameClash } = await supabase
            .from('stores')
            .select('id')
            .ilike('name', String(name).trim())
            .maybeSingle();
        if (nameClash) {
            return res.status(409).json({ success: false, error: 'A store with this name already exists. Please choose another name.' });
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

        // Only update fields the client actually sent, so saving the store
        // profile form (which omits logo_url) can't wipe an existing logo.
        const updateData = {};
        if (name        !== undefined) updateData.name        = name;
        if (slug        !== undefined) updateData.slug        = slug;
        if (description !== undefined) updateData.description = description;
        if (logo_url    !== undefined) updateData.logo_url    = logo_url;

        // If renaming, ensure no OTHER store already uses the name (case-insensitive).
        if (name !== undefined && String(name).trim()) {
            const { data: nameClash } = await supabase
                .from('stores')
                .select('id')
                .ilike('name', String(name).trim())
                .neq('id', req.params.id)
                .maybeSingle();
            if (nameClash) {
                return res.status(409).json({ success: false, error: 'A store with this name already exists. Please choose another name.' });
            }
        }

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