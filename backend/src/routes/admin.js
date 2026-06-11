const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { verifyToken } = require('./auth');
const requireAdmin = require('../middleware/requireAdmin');
const { sendEmail, escapeHtml, sellerApprovedHtml } = require('../services/email');
const { withTimeout, makeCache, getEmailMap } = require('../lib/resilience');
const { getSetting, setSetting } = require('../lib/settings');
const { REVENUE_STATUSES } = require('../lib/orderStatus');
const statsCache = makeCache({ ttlMs: 30 * 1000 });
const listCache = makeCache({ ttlMs: 30 * 1000 });

router.get('/stats', verifyToken, requireAdmin, async (req, res, next) => {
    try {
        const cached = statsCache.get('stats');
        if (cached && cached.fresh) return res.status(200).json(cached.value);

        // Six months ago for trend queries
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        const sixMonthsAgoISO = sixMonthsAgo.toISOString();

        const [
            productsRes,
            ordersRecentRes,
            ordersCountRes,
            allOrderStatusRes,
            revenueRes,
            trendRes,
            totalUsersRes,
            customersCountRes,
            sellersCountRes,
            adminsCountRes,
            storesRes,
            sellerAppsRes,
            reviewsRes,
        ] = await Promise.all([
            // Products (active only, for low-stock + pending approvals)
            supabase.from('products').select('id, name, stock, status').eq('is_active', true),
            // Last 10 orders for the recent-orders table
            supabase.from('orders').select('id, status, total_amount, created_at, user_id, payment_method')
                .order('created_at', { ascending: false }).limit(10),
            // Total order count
            supabase.from('orders').select('id', { count: 'exact', head: true }),
            // ALL orders by status for breakdown chart
            supabase.from('orders').select('status'),
            // Total revenue: all orders that represent received money. MUST include
            // 'shipped' — a paid order that's been shipped is still revenue (otherwise
            // shipping an order makes its money vanish from the dashboard).
            supabase.from('orders').select('id, total_amount').in('status', REVENUE_STATUSES),
            // Monthly revenue trend: last 6 months
            supabase.from('orders').select('total_amount, created_at')
                .in('status', REVENUE_STATUSES)
                .gte('created_at', sixMonthsAgoISO),
            // ALL registered users (profiles) — covers every role including unsynced
            supabase.from('profiles').select('id', { count: 'exact', head: true }),
            // Customers only
            supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'customer'),
            // Sellers
            supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'seller'),
            // Admins
            supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'admin'),
            // Stores (all statuses for approved/pending split)
            supabase.from('stores').select('status'),
            // Seller applications
            supabase.from('seller_applications').select('status'),
            // Product reviews
            supabase.from('reviews').select('rating'),
        ]);

        if (productsRes.error)      throw productsRes.error;
        if (ordersRecentRes.error)  throw ordersRecentRes.error;
        if (ordersCountRes.error)   throw ordersCountRes.error;
        if (customersCountRes.error) throw customersCountRes.error;
        if (storesRes.error)        throw storesRes.error;

        const products      = productsRes.data || [];
        const recentOrders  = ordersRecentRes.data || [];
        const orderCount    = typeof ordersCountRes.count === 'number' ? ordersCountRes.count : 0;
        const totalUsers    = typeof totalUsersRes.count === 'number' ? totalUsersRes.count : 0;
        const customerCount = typeof customersCountRes.count === 'number' ? customersCountRes.count : 0;
        const sellerCount   = typeof sellersCountRes.count === 'number' ? sellersCountRes.count : 0;
        const adminCount    = typeof adminsCountRes.count === 'number' ? adminsCountRes.count : 0;
        const stores        = storesRes.data || [];
        const storesApproved = stores.filter(s => s.status === 'approved').length;
        const storesPending  = stores.filter(s => s.status === 'pending').length;
        const sellerApps    = sellerAppsRes.error ? [] : (sellerAppsRes.data || []);
        const reviews       = reviewsRes.error  ? [] : (reviewsRes.data  || []);
        const allOrders     = allOrderStatusRes.error ? [] : (allOrderStatusRes.data || []);
        const revenueOrders = revenueRes.error   ? [] : (revenueRes.data   || []);
        const trendOrders   = trendRes.error     ? [] : (trendRes.data     || []);

        // ── Totals ───────────────────────────────────────────────────────────
        const totalRevenue = revenueOrders.reduce((s, o) => s + Number(o.total_amount || 0), 0);

        // ── Units sold + platform commission (paid/processing/shipped/delivered) ─
        // Commission is the admin's 10% cut of sellers' product sales.
        const PLATFORM_COMMISSION_RATE = 0.10;
        let unitsSold = 0;
        let productSales = 0; // Σ(unit_price × qty) across revenue orders (excludes delivery fee)
        const revenueOrderIds = revenueOrders.map((o) => o.id).filter(Boolean);
        if (revenueOrderIds.length) {
            const { data: soldItems } = await supabase
                .from('order_items')
                .select('quantity, unit_price')
                .in('order_id', revenueOrderIds);
            unitsSold = (soldItems || []).reduce((s, i) => s + Number(i.quantity || 0), 0);
            productSales = (soldItems || []).reduce((s, i) => s + Number(i.unit_price || 0) * Number(i.quantity || 0), 0);
        }
        const platformCommission = productSales * PLATFORM_COMMISSION_RATE;

        // ── Order status breakdown (ALL orders) ──────────────────────────────
        const ordersByStatus = allOrders.reduce((acc, o) => {
            acc[o.status] = (acc[o.status] || 0) + 1;
            return acc;
        }, {});

        // ── Monthly revenue trend (last 6 months) ────────────────────────────
        const monthlyMap = {};
        for (let i = 5; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            monthlyMap[key] = { month: key, revenue: 0, orders: 0 };
        }
        trendOrders.forEach((o) => {
            const d   = new Date(o.created_at);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            if (monthlyMap[key]) {
                monthlyMap[key].revenue += Number(o.total_amount || 0);
                monthlyMap[key].orders  += 1;
            }
        });
        const monthlyTrend = Object.values(monthlyMap);

        // ── Low stock ────────────────────────────────────────────────────────
        const lowStockItems = products
            .filter((p) => Number(p.stock || 0) < 10)
            .sort((a, b) => Number(a.stock) - Number(b.stock))
            .slice(0, 8)
            .map((p) => ({ id: p.id, name: p.name, stock: p.stock }));

        // ── Pending approvals ────────────────────────────────────────────────
        const pendingProductsCount   = products.filter((p) => p.status === 'pending').length;
        const pendingStoresCount     = stores.filter((s) => s.status === 'pending').length;
        const pendingSellerAppsCount = sellerApps.filter((a) => a.status === 'pending').length;
        const pendingApprovals       = pendingProductsCount + pendingStoresCount + pendingSellerAppsCount;

        // ── Reviews ──────────────────────────────────────────────────────────
        const totalReviews  = reviews.length;
        const averageRating = totalReviews
            ? Number((reviews.reduce((s, r) => s + Number(r.rating || 0), 0) / totalReviews).toFixed(2))
            : 0;

        // ── Recent orders (for table) ─────────────────────────────────────────
        const orderUserIds = [...new Set(recentOrders.map((o) => o.user_id).filter(Boolean))];
        const [{ data: orderUsers }, emailMap] = await Promise.all([
            orderUserIds.length
                ? supabase.from('profiles').select('id, full_name, username').in('id', orderUserIds)
                : Promise.resolve({ data: [] }),
            getEmailMap(),
        ]);
        const orderUserMap = new Map((orderUsers || []).map((u) => [u.id, u]));

        const payload = {
            success: true,
            data: {
                products:        products.length,
                orders:          orderCount,
                totalUsers,
                customers:       customerCount,
                sellers:         sellerCount,
                admins:          adminCount,
                storesApproved,
                storesPending,
                revenue:         totalRevenue,
                unitsSold,
                productSales,
                platformCommission,
                ordersByStatus,
                monthlyTrend,
                recentOrders: recentOrders.map((o) => {
                    const raw   = orderUserMap.get(o.user_id);
                    const parts = String(raw?.full_name || '').trim().split(' ').filter(Boolean);
                    return {
                        _id:         o.id,
                        id:          o.id,
                        status:      o.status,
                        paymentMethod: o.payment_method || null,
                        // Same derivation as GET /api/orders/all so the dashboard
                        // and the orders page agree: shipped/delivered imply paid.
                        paymentStatus: REVENUE_STATUSES.includes(o.status) ? 'paid' : 'pending',
                        totalAmount: Number(o.total_amount || 0),
                        createdAt:   o.created_at,
                        user: {
                            firstName: parts[0] || raw?.username || 'User',
                            lastName:  parts.slice(1).join(' ') || '',
                            email:     emailMap.get(o.user_id) || raw?.username || '',
                        },
                    };
                }),
                lowStock: lowStockItems,
                pendingApprovals,
                analytics: {
                    totalReviews,
                    averageRating,
                    pendingProductsCount,
                    pendingStoresCount,
                    pendingSellerAppsCount,
                },
            },
        };
        statsCache.set('stats', payload);
        return res.status(200).json(payload);
    } catch (err) {
        const cached = statsCache.get('stats');
        if (cached) return res.status(200).json({ ...cached.value, stale: true });
        console.error('admin /stats failed:', err?.message || err);
        return res.status(503).json({ success: false, error: 'Stats temporarily unavailable' });
    }
});

// Lightweight counts for the sidebar attention badges (pending approvals + payouts).
// Cheap head-count queries; tolerant of any missing table (returns 0 for it).
const badgeCache = makeCache({ ttlMs: 20 * 1000 });
router.get('/badge-counts', verifyToken, requireAdmin, async (req, res) => {
    const cached = badgeCache.get('counts');
    if (cached && cached.fresh) return res.status(200).json(cached.value);
    try {
        const pending = async (table) => {
            const { count, error } = await supabase
                .from(table)
                .select('id', { count: 'exact', head: true })
                .eq('status', 'pending');
            return error ? 0 : (count || 0);
        };
        const [products, stores, sellerApps, payouts] = await Promise.all([
            pending('products'),
            pending('stores'),
            pending('seller_applications'),
            pending('seller_payouts'),
        ]);
        const payload = {
            success: true,
            data: { approvals: products + stores + sellerApps, payouts },
        };
        badgeCache.set('counts', payload);
        return res.status(200).json(payload);
    } catch (err) {
        return res.status(200).json({ success: true, data: { approvals: 0, payouts: 0 } });
    }
});

router.get('/customers', verifyToken, requireAdmin, async (req, res, next) => {
    try {
        const parsedPage  = Math.max(1, Number(req.query.page)  || 1);
        const parsedLimit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
        const offset      = (parsedPage - 1) * parsedLimit;

        const cacheKey = `customers:${parsedPage}:${parsedLimit}`;
        const hit = listCache.get(cacheKey);
        if (hit && hit.fresh) return res.status(200).json(hit.value);

        const { data: profiles, error, count } = await withTimeout(
            (signal) => supabase
                .from('profiles')
                .select('*', { count: 'exact' })
                .order('created_at', { ascending: false })
                .range(offset, offset + parsedLimit - 1)
                .abortSignal(signal),
            12 * 1000,
        );
        if (error) throw error;

        const userIds = (profiles || []).map((p) => p.id);
        const { data: orders } = userIds.length
            ? await supabase.from('orders').select('id, user_id, total_amount').in('status', REVENUE_STATUSES)
            : { data: [] };

        // Fetch real emails in one batch (cached/shared across admin routes)
        const emailMap = await getEmailMap();

        const stats = (orders || []).reduce((map, o) => {
            const entry = map.get(o.user_id) || { orderCount: 0, totalSpent: 0 };
            entry.orderCount += 1;
            entry.totalSpent += Number(o.total_amount || 0);
            map.set(o.user_id, entry);
            return map;
        }, new Map());

        const data = (profiles || []).map((p) => {
            const names = (p.full_name || '').split(' ');
            const s     = stats.get(p.id) || { orderCount: 0, totalSpent: 0 };
            return {
                _id:        p.id,
                id:         p.id,
                firstName:  names[0] || p.username || 'User',
                lastName:   names.slice(1).join(' ') || '',
                email:      emailMap.get(p.id) || p.username || '',
                image:      p.avatar_url || '',
                provider:   'email',
                role:       p.role || 'customer',
                orderCount: s.orderCount,
                totalSpent: s.totalSpent,
                createdAt:  p.created_at,
            };
        });

        const payload = { success: true, data, pagination: { total: count || 0, page: parsedPage, limit: parsedLimit } };
        listCache.set(cacheKey, payload);
        return res.status(200).json(payload);
    } catch (err) {
        const hit = listCache.get(`customers:${Math.max(1, Number(req.query.page) || 1)}:${Math.min(100, Math.max(1, Number(req.query.limit) || 50))}`);
        if (hit) return res.status(200).json({ ...hit.value, stale: true });
        console.error('admin /customers failed:', err?.message || err);
        return res.status(503).json({ success: false, error: 'Customers temporarily unavailable' });
    }
});

router.get('/sellers', verifyToken, requireAdmin, async (req, res, next) => {
    try {
        const parsedPage  = Math.max(1, Number(req.query.page)  || 1);
        const parsedLimit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
        const offset      = (parsedPage - 1) * parsedLimit;

        const cacheKey = `sellers:${parsedPage}:${parsedLimit}`;
        const hit = listCache.get(cacheKey);
        if (hit && hit.fresh) return res.status(200).json(hit.value);

        const { data: profiles, error, count } = await withTimeout(
            (signal) => supabase
                .from('profiles')
                .select('*', { count: 'exact' })
                .eq('role', 'seller')
                .order('created_at', { ascending: false })
                .range(offset, offset + parsedLimit - 1)
                .abortSignal(signal),
            12 * 1000,
        );
        if (error) throw error;

        const sellerIds = (profiles || []).map((p) => p.id);
        let stores   = [];
        let products = [];
        // Compute total sales, revenue, and orders per seller
        let sellerSalesMap = new Map();
        let sellerOrdersMap = new Map();
        if (sellerIds.length) {
          // fetch order items for these sellers
          const { data: orderItems, error: oiErr } = await supabase
            .from('order_items')
            .select('order_id, quantity, unit_price, seller_id')
            .in('seller_id', sellerIds);
          if (oiErr) throw oiErr;
          const orderIds = [...new Set((orderItems || []).map((i) => i.order_id))];
          const { data: paidOrders, error: poErr } = await supabase
            .from('orders')
            .select('id')
            .in('id', orderIds)
            .in('status', REVENUE_STATUSES);
          if (poErr) throw poErr;
          const paidSet = new Set((paidOrders || []).map((o) => o.id));
          const paidItems = (orderItems || []).filter(i => paidSet.has(i.order_id));
          for (const item of paidItems) {
            const sid = item.seller_id;
            const cur = sellerSalesMap.get(sid) || { total_sales: 0, total_revenue: 0 };
            cur.total_sales += Number(item.quantity);
            cur.total_revenue += Number(item.unit_price) * Number(item.quantity);
            sellerSalesMap.set(sid, cur);
            // Track orders per seller
            let orderSet = sellerOrdersMap.get(sid);
            if (!orderSet) { orderSet = new Set(); sellerOrdersMap.set(sid, orderSet); }
            orderSet.add(item.order_id);
          }
        }

        if (sellerIds.length) {
            const [storesRes, productsRes] = await Promise.all([
                supabase.from('stores').select('id, owner_id, name, slug, status, logo_url').in('owner_id', sellerIds),
                supabase.from('products').select('id, seller_id').eq('is_active', true).in('seller_id', sellerIds),
            ]);
            if (!storesRes.error)   stores   = storesRes.data   || [];
            if (!productsRes.error) products = productsRes.data || [];
        }

        // Fetch real emails (cached/shared across admin routes)
        const emailMap = await getEmailMap();

        const storeMap = new Map((stores || []).map((s) => [
            s.owner_id,
            { id: s.id, name: s.name, slug: s.slug, status: s.status || 'pending', logo_url: s.logo_url },
        ]));
        const productCountMap = (products || []).reduce((map, p) => {
            map.set(p.seller_id, (map.get(p.seller_id) || 0) + 1);
            return map;
        }, new Map());

        const data = (profiles || []).map((p) => {
            const names = (p.full_name || '').split(' ');
            const store = storeMap.get(p.id) || null;
            return {
                _id:          p.id,
                firstName:    names[0] || p.username || 'Seller',
                lastName:     names.slice(1).join(' ') || '',
                email:        emailMap.get(p.id) || p.username || '',
                image:        p.avatar_url || '',
                store,
                product_count: productCountMap.get(p.id) || 0,
                total_sales: (sellerOrdersMap.get(p.id) || new Set()).size || 0,
                total_units: (sellerSalesMap.get(p.id) || {}).total_sales || 0,
                total_revenue: (sellerSalesMap.get(p.id) || {}).total_revenue || 0,
                joinedAt:     p.created_at,
            };
        });

        const payload = { success: true, data, pagination: { total: count || 0, page: parsedPage, limit: parsedLimit } };
        listCache.set(cacheKey, payload);
        return res.status(200).json(payload);
    } catch (err) {
        const hit = listCache.get(`sellers:${Math.max(1, Number(req.query.page) || 1)}:${Math.min(100, Math.max(1, Number(req.query.limit) || 50))}`);
        if (hit) return res.status(200).json({ ...hit.value, stale: true });
        console.error('admin /sellers failed:', err?.message || err);
        return res.status(503).json({ success: false, error: 'Sellers temporarily unavailable' });
    }
});

router.delete('/customers/:id', verifyToken, requireAdmin, async (req, res, next) => {
    try {
        const { id } = req.params;
        if (id === req.user.id)
            return res.status(400).json({ success: false, error: 'Cannot delete your own account' });

        const { data: profile } = await supabase.from('profiles').select('role').eq('id', id).single();
        if (!profile)
            return res.status(404).json({ success: false, error: 'User not found' });
        if (profile.role === 'admin')
            return res.status(403).json({ success: false, error: 'Cannot delete admin accounts' });

        const { error } = await supabase.auth.admin.deleteUser(id);
        if (error) throw error;
        res.status(200).json({ success: true, message: 'User removed successfully' });
    } catch (err) {
        next(err);
    }
});

router.put('/promote', verifyToken, requireAdmin, async (req, res, next) => {
    try {
        const { userId, newRole } = req.body;
        if (!userId || !['admin', 'customer', 'seller'].includes(newRole)) {
            return res.status(400).json({ success: false, error: 'Valid userId and newRole are required' });
        }

        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();
        if (profileError || !profile) throw profileError || new Error('User not found');

        const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
        if (error) throw error;

        if (newRole === 'seller' && profile.role !== 'seller') {
            try {
                const { data: existingStore } = await supabase
                    .from('stores')
                    .select('id')
                    .eq('owner_id', userId)
                    .maybeSingle();

                if (!existingStore) {
                    const storeName    = profile.full_name ? `${profile.full_name}'s Store` : 'My Store';
                    const baseSlug     = storeName.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
                    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
                    const slug         = baseSlug ? `${baseSlug}-${randomSuffix}` : `store-${userId.slice(0, 8)}`;

                    await supabase.from('stores').insert({
                        owner_id:    userId,
                        name:        storeName,
                        slug,
                        description: `Welcome to ${storeName}!`,
                        status:      'pending',
                    });
                }
            } catch (err) {
                console.error('[PROMOTE] Store creation error:', err.message);
            }
        }

        res.status(200).json({ success: true, message: `User role updated to ${newRole}` });
    } catch (err) {
        next(err);
    }
});

router.get('/seller-applications', verifyToken, requireAdmin, async (req, res, next) => {
    try {
        const { status } = req.query;
        let query = supabase
            .from('seller_applications')
            .select('*')
            .order('created_at', { ascending: false });

        if (status && ['pending', 'approved', 'rejected'].includes(status)) {
            query = query.eq('status', status);
        }

        const { data, error } = await withTimeout((signal) => query.abortSignal(signal), 12 * 1000);
        if (error) throw error;

        res.status(200).json({ success: true, data: data || [], pagination: { total: (data || []).length } });
    } catch (err) {
        console.error('admin /seller-applications failed:', err?.message || err);
        return res.status(503).json({ success: false, error: 'Applications temporarily unavailable' });
    }
});

router.post('/approve-seller/:user_id', verifyToken, requireAdmin, async (req, res, next) => {
    try {
        const { user_id }   = req.params;
        const adminNotes    = req.body?.adminNotes || null;

        const { data: application, error: appError } = await supabase
            .from('seller_applications')
            .select('*')
            .eq('user_id', user_id)
            .maybeSingle();
        if (appError) throw appError;
        if (!application) {
            return res.status(404).json({ success: false, error: 'Seller application not found' });
        }

        const { error: roleError } = await supabase
            .from('profiles')
            .update({ role: 'seller' })
            .eq('id', user_id);
        if (roleError) throw roleError;

        const { data, error: updateError } = await supabase
            .from('seller_applications')
            .update({
                status:      'approved',
                reviewed_by: req.user.id,
                reviewed_at: new Date().toISOString(),
                admin_notes: adminNotes,
            })
            .eq('user_id', user_id)
            .select('*')
            .single();
        if (updateError) throw updateError;

        try {
            const { data: existingStore } = await supabase
                .from('stores')
                .select('id')
                .eq('owner_id', user_id)
                .maybeSingle();

            if (!existingStore) {
                const businessName = application.business_name || 'My Store';
                const baseSlug     = businessName.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
                const randomSuffix = Math.floor(1000 + Math.random() * 9000);
                const slug         = baseSlug ? `${baseSlug}-${randomSuffix}` : `store-${user_id.slice(0, 8)}`;

                const { error: storeError } = await supabase.from('stores').insert({
                    owner_id:    user_id,
                    name:        businessName,
                    slug,
                    description: `Welcome to ${businessName}!`,
                    status:      'approved',
                });
                if (storeError) console.error('[APPROVE_SELLER] Failed to create store:', storeError.message);
            }
        } catch (storeCreateErr) {
            console.error('[APPROVE_SELLER] Store creation catch-block error:', storeCreateErr.message);
        }

        res.status(200).json({ success: true, data });

        sendEmail({
            to:          application.email,
            subject:     'Your Hilgod Seller Application Has Been Approved',
            html:        sellerApprovedHtml(application.full_name || 'Seller', application.business_name || 'your business'),
            emailType:   'seller_approval',
            userId:      user_id,
        }).catch(() => {});
    } catch (err) {
        next(err);
    }
});

router.post('/reject-seller/:user_id', verifyToken, requireAdmin, async (req, res, next) => {
    try {
        const { user_id } = req.params;
        const adminNotes  = req.body?.adminNotes || null;

        const { data: application, error: appError } = await supabase
            .from('seller_applications')
            .select('*')
            .eq('user_id', user_id)
            .maybeSingle();
        if (appError) throw appError;
        if (!application) {
            return res.status(404).json({ success: false, error: 'Seller application not found' });
        }

        const { error: roleError } = await supabase
            .from('profiles')
            .update({ role: 'customer' })
            .eq('id', user_id);
        if (roleError) throw roleError;

        const { data, error: updateError } = await supabase
            .from('seller_applications')
            .update({
                status:      'rejected',
                reviewed_by: req.user.id,
                reviewed_at: new Date().toISOString(),
                admin_notes: adminNotes,
            })
            .eq('user_id', user_id)
            .select('*')
            .single();
        if (updateError) throw updateError;

        res.status(200).json({ success: true, data });
    } catch (err) {
        next(err);
    }
});

// ── Rider Applications ────────────────────────────────────────────────────────

router.get('/riders', verifyToken, requireAdmin, async (req, res, next) => {
    try {
        const status = req.query.status || null;
        let query = supabase.from('rider_applications').select('*').order('applied_at', { ascending: false });
        if (status) query = query.eq('status', status);
        const { data, error } = await withTimeout((signal) => query.abortSignal(signal), 12 * 1000);
        if (error) throw error;
        res.status(200).json({ success: true, data: data || [] });
    } catch (err) {
        console.error('admin /riders failed:', err?.message || err);
        return res.status(503).json({ success: false, error: 'Riders temporarily unavailable' });
    }
});

router.put('/riders/:id', verifyToken, requireAdmin, async (req, res, next) => {
    try {
        const { id }                  = req.params;
        const { status, admin_notes } = req.body;
        const allowed = ['pending', 'approved', 'rejected'];
        if (!allowed.includes(status)) {
            return res.status(400).json({ success: false, error: 'Invalid status' });
        }
        const { data, error } = await supabase
            .from('rider_applications')
            .update({ status, admin_notes: admin_notes || null, reviewed_at: new Date().toISOString() })
            .eq('id', id)
            .select('*')
            .single();
        if (error) throw error;
        if (!data) return res.status(404).json({ success: false, error: 'Application not found' });

        const safeName  = escapeHtml(data.full_name || 'Applicant');
        const safePhone = escapeHtml(data.phone || '');
        const safeNotes = data.admin_notes ? escapeHtml(data.admin_notes) : null;

        if (status === 'approved') {
            sendEmail({
                to:        data.email,
                subject:   'Your Hilgod Rider Application Has Been Approved!',
                html:      `<div style="font-family:sans-serif;max-width:560px;margin:0 auto">
                  <h2 style="color:#E31C1C">Congratulations, ${safeName}!</h2>
                  <p>Your application to join Hilgod's delivery fleet has been <strong>approved</strong>.</p>
                  <p>Our onboarding team will reach out to you at <strong>${safePhone}</strong> within 24 hours to get you started.</p>
                </div>`,
                emailType: 'rider_approval',
                userId:    req.user.id,
            }).catch(() => {});
        } else if (status === 'rejected') {
            sendEmail({
                to:        data.email,
                subject:   'Update on Your Hilgod Rider Application',
                html:      `<div style="font-family:sans-serif;max-width:560px;margin:0 auto">
                  <h2 style="color:#333">Application Update</h2>
                  <p>Hi ${safeName}, unfortunately your rider application was not successful at this time.</p>
                  ${safeNotes ? `<p><strong>Reason:</strong> ${safeNotes}</p>` : ''}
                  <p>You are welcome to reapply in the future. Email <a href="mailto:hilgodonline@gmail.com">hilgodonline@gmail.com</a> if you have questions.</p>
                </div>`,
                emailType: 'rider_rejection',
                userId:    req.user.id,
            }).catch(() => {});
        }

        res.status(200).json({ success: true, data });
    } catch (err) { next(err); }
});

router.delete('/riders/:id', verifyToken, requireAdmin, async (req, res, next) => {
    try {
        const { id } = req.params;
        const { error } = await supabase.from('rider_applications').delete().eq('id', id);
        if (error) throw error;
        res.status(200).json({ success: true, message: 'Application deleted' });
    } catch (err) { next(err); }
});

// ── Seller Payout Management ──────────────────────────────────────────────────

// GET /api/admin/payouts — list all payout requests
router.get('/payouts', verifyToken, requireAdmin, async (req, res, next) => {
  try {
    const { status } = req.query;
    let query = supabase
      .from('seller_payouts')
      .select('id, seller_id, amount, status, payment_method, payment_details, admin_notes, requested_at, processed_at')
      .order('requested_at', { ascending: false });
    if (status && ['pending','approved','paid','rejected'].includes(status)) {
      query = query.eq('status', status);
    }
    const { data, error } = await query;
    if (error) throw error;

    // Attach seller emails
    const emailMap = await getEmailMap();
    const sellerIds = [...new Set((data || []).map(p => p.seller_id))];
    const { data: profiles } = sellerIds.length
      ? await supabase.from('profiles').select('id, full_name, username').in('id', sellerIds)
      : { data: [] };
    const profileMap = new Map((profiles || []).map(p => [p.id, p]));

    const enriched = (data || []).map(p => ({
      ...p,
      seller: {
        id: p.seller_id,
        name: profileMap.get(p.seller_id)?.full_name || profileMap.get(p.seller_id)?.username || 'Seller',
        email: emailMap.get(p.seller_id) || '',
      },
    }));

    res.json({ success: true, data: enriched });
  } catch (err) { next(err); }
});

// PUT /api/admin/payouts/:id — approve, mark paid, or reject a payout request
router.put('/payouts/:id', verifyToken, requireAdmin, async (req, res, next) => {
  try {
    const { status, admin_notes } = req.body;
    if (!['approved','paid','rejected'].includes(status)) {
      return res.status(400).json({ success: false, error: 'status must be approved, paid, or rejected' });
    }
    const { data, error } = await supabase
      .from('seller_payouts')
      .update({ status, admin_notes: admin_notes || null, processed_at: new Date().toISOString(), processed_by: req.user.id })
      .eq('id', req.params.id)
      .select().single();
    if (error) throw error;
    if (!data) return res.status(404).json({ success: false, error: 'Payout not found' });
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

// ── Platform settings ──────────────────────────────────────────────────────────

// GET /api/admin/settings — current platform settings (admins).
router.get('/settings', verifyToken, requireAdmin, async (req, res, next) => {
  try {
    const autoApproveProducts = (await getSetting('auto_approve_products', false)) === true;
    res.json({ success: true, data: { autoApproveProducts } });
  } catch (err) { next(err); }
});

// PUT /api/admin/settings — update platform settings (admins).
router.put('/settings', verifyToken, requireAdmin, async (req, res, next) => {
  try {
    if (typeof req.body.autoApproveProducts === 'boolean') {
      await setSetting('auto_approve_products', req.body.autoApproveProducts);
    }
    const autoApproveProducts = (await getSetting('auto_approve_products', false)) === true;
    res.json({ success: true, data: { autoApproveProducts } });
  } catch (err) { next(err); }
});

module.exports = router;
