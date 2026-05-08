const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { verifyToken } = require('./auth');
const { sendEmail, sellerApprovedHtml } = require('../services/email');

const requireAdmin = async (req, res, next) => {
    try {
        const { data: profile, error } = await supabase.from('profiles').select('role').eq('id', req.user.id).single();
        if (error || !profile || profile.role !== 'admin') return res.status(403).json({ success: false, error: 'Admin access required' });
        next();
    } catch (err) {
        next(err);
    }
};

router.get('/stats', verifyToken, requireAdmin, async (req, res, next) => {
    try {
        const [productsRes, ordersRecentRes, ordersCountRes, customersCountRes, storesRes, sellerAppsRes, reviewsRes] =
            await Promise.all([
                supabase.from('products').select('id, name, stock, status'),
                supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(10),
                supabase.from('orders').select('id', { count: 'exact', head: true }),
                supabase.from('profiles').select('id', { count: 'exact', head: true }),
                supabase.from('stores').select('status'),
                supabase.from('seller_applications').select('status'),
                supabase.from('product_reviews').select('rating'),
            ]);

        if (productsRes.error) throw productsRes.error;
        if (ordersRecentRes.error) throw ordersRecentRes.error;
        if (ordersCountRes.error) throw ordersCountRes.error;
        if (customersCountRes.error) throw customersCountRes.error;
        if (storesRes.error) throw storesRes.error;
        if (sellerAppsRes.error) throw sellerAppsRes.error;

        const products = productsRes.data || [];
        const orders = ordersRecentRes.data || [];
        const orderCount = typeof ordersCountRes.count === 'number' ? ordersCountRes.count : orders.length;
        const customerCount = typeof customersCountRes.count === 'number' ? customersCountRes.count : 0;
        const stores = storesRes.data || [];
        const sellerApps = sellerAppsRes.data || [];
        const reviews = reviewsRes.error ? [] : (reviewsRes.data || []);

        const lowStockItems = products
            .filter((p) => Number(p.stock || 0) < 10)
            .slice(0, 5)
            .map((p) => ({ ...p, _id: p.id, id: p.id }));

        const pendingApprovals =
            products.filter((p) => p.status === 'pending').length +
            stores.filter((s) => s.status === 'pending').length +
            sellerApps.filter((a) => a.status === 'pending').length;
        const pendingProductsCount = products.filter((p) => p.status === 'pending').length;
        const pendingStoresCount = stores.filter((s) => s.status === 'pending').length;
        const pendingSellerAppsCount = sellerApps.filter((a) => a.status === 'pending').length;
        const totalReviews = reviews.length;
        const averageRating = totalReviews
            ? Number((reviews.reduce((sum, r) => sum + Number(r.rating || 0), 0) / totalReviews).toFixed(2))
            : 0;

        const totalRevenue = (orders || []).reduce(
            (sum, order) => sum + (['paid', 'delivered'].includes(order.status) ? Number(order.total_amount || 0) : 0),
            0
        );

        const orderUserIds = [...new Set((orders || []).map((o) => o.user_id).filter(Boolean))];
        const { data: orderUsers, error: orderUsersError } = orderUserIds.length
            ? await supabase.from('profiles').select('id, full_name, username').in('id', orderUserIds)
            : { data: [], error: null };
        if (orderUsersError) throw orderUsersError;
        const orderUserMap = new Map((orderUsers || []).map((u) => [u.id, u]));

        res.status(200).json({
            success: true,
            data: {
                products: products.length,
                orders: orderCount,
                customers: customerCount,
                revenue: totalRevenue,
                recentOrders: orders.map((o) => ({
                    _id: o.id,
                    id: o.id,
                    status: o.status,
                    paymentStatus: o.status === 'paid' ? 'paid' : 'pending',
                    totalAmount: Number(o.total_amount || 0),
                    createdAt: o.created_at,
                    user: (() => {
                        const raw = orderUserMap.get(o.user_id);
                        const parts = String(raw?.full_name || '').trim().split(' ').filter(Boolean);
                        return {
                            firstName: parts[0] || raw?.username || 'User',
                            lastName: parts.slice(1).join(' ') || '',
                            email: raw?.username || '',
                        };
                    })(),
                })),
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
        });
    } catch (err) {
        next(err);
    }
});

router.get('/customers', verifyToken, requireAdmin, async (req, res, next) => {
    try {
        const { data: profiles, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
        if (error) throw error;

        const userIds = (profiles || []).map((p) => p.id);
        const { data: orders } = userIds.length
            ? await supabase.from('orders').select('id, user_id, total_amount')
            : { data: [] };

        const stats = (orders || []).reduce((map, o) => {
            const entry = map.get(o.user_id) || { orderCount: 0, totalSpent: 0 };
            entry.orderCount += 1;
            entry.totalSpent += Number(o.total_amount || 0);
            map.set(o.user_id, entry);
            return map;
        }, new Map());

        const data = (profiles || []).map((p) => {
            const names = (p.full_name || '').split(' ');
            const s = stats.get(p.id) || { orderCount: 0, totalSpent: 0 };
            return {
                _id: p.id,
                id: p.id,
                firstName: names[0] || p.username || 'User',
                lastName: names.slice(1).join(' ') || '',
                email: p.username || '',
                image: p.avatar_url || '',
                provider: 'email',
                role: p.role || 'customer',
                orderCount: s.orderCount,
                totalSpent: s.totalSpent,
                createdAt: p.created_at
            };
        });

        res.status(200).json({ success: true, data, pagination: { total: data.length } });
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

        const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
        if (error) throw error;
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

        const { data, error } = await query;
        if (error) throw error;

        res.status(200).json({
            success: true,
            data: data || [],
            pagination: { total: (data || []).length },
        });
    } catch (err) {
        next(err);
    }
});

router.post('/approve-seller/:user_id', verifyToken, requireAdmin, async (req, res, next) => {
    try {
        const { user_id } = req.params;
        const adminNotes = req.body?.adminNotes || null;

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
                status: 'approved',
                reviewed_by: req.user.id,
                reviewed_at: new Date().toISOString(),
                admin_notes: adminNotes,
            })
            .eq('user_id', user_id)
            .select('*')
            .single();
        if (updateError) throw updateError;

        res.status(200).json({ success: true, data });

        // Fire-and-forget approval email
        const applicantEmail = application.email;
        const applicantName = application.full_name || 'Seller';
        const businessName = application.business_name || 'your business';
        sendEmail({
            to: applicantEmail,
            subject: 'Your Hilgod Seller Application Has Been Approved',
            html: sellerApprovedHtml(applicantName, businessName),
        }).catch(() => {});
    } catch (err) {
        next(err);
    }
});

router.post('/reject-seller/:user_id', verifyToken, requireAdmin, async (req, res, next) => {
    try {
        const { user_id } = req.params;
        const adminNotes = req.body?.adminNotes || null;

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
                status: 'rejected',
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

module.exports = router;
