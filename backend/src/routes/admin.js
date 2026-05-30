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
                supabase.from('products').select('id, name, stock, status').eq('is_active', true),
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
            ? await supabase.from('orders').select('id, user_id, total_amount').in('status', ['paid', 'shipped', 'delivered'])
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

// GET /admin/sellers
router.get('/sellers', verifyToken, requireAdmin, async (req, res, next) => {
    try {
        const { data: profiles, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('role', 'seller')
            .order('created_at', { ascending: false });
        if (error) throw error;

        const sellerIds = (profiles || []).map(p => p.id);
        let stores = [];
        let products = [];

        if (sellerIds.length) {
            const [storesRes, productsRes] = await Promise.all([
                supabase.from('stores').select('id, owner_id, name, slug, status, logo_url').in('owner_id', sellerIds),
                supabase.from('products').select('id, seller_id').eq('is_active', true).in('seller_id', sellerIds)
            ]);

            if (storesRes.error) {
                console.error('[ADMIN/SELLERS] Stores query error:', storesRes.error);
            } else {
                stores = storesRes.data || [];
            }

            if (productsRes.error) {
                console.error('[ADMIN/SELLERS] Products query error:', productsRes.error);
            } else {
                products = productsRes.data || [];
            }
        }

        const storeMap = new Map((stores || []).map(s => [
            s.owner_id,
            {
                id: s.id,
                name: s.name,
                slug: s.slug,
                status: s.status || 'pending',
                logo_url: s.logo_url
            }
        ]));
        const productCountMap = (products || []).reduce((map, p) => {
            map.set(p.seller_id, (map.get(p.seller_id) || 0) + 1);
            return map;
        }, new Map());

        const data = (profiles || []).map(p => {
            const names = (p.full_name || '').split(' ');
            const store = storeMap.get(p.id) || null;
            return {
                _id: p.id,
                firstName: names[0] || p.username || 'Seller',
                lastName: names.slice(1).join(' ') || '',
                email: p.username || '',
                image: p.avatar_url || '',
                store,
                productCount: productCountMap.get(p.id) || 0,
                joinedAt: p.created_at,
            };
        });

        res.status(200).json({ success: true, data, pagination: { total: data.length } });
    } catch (err) {
        next(err);
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

        // Auto-create store if promoting to seller
        if (newRole === 'seller' && profile.role !== 'seller') {
            try {
                const { data: existingStore } = await supabase
                    .from('stores')
                    .select('id')
                    .eq('owner_id', userId)
                    .maybeSingle();

                if (!existingStore) {
                    const storeName = profile.full_name ? `${profile.full_name}'s Store` : 'My Store';
                    const baseSlug = storeName.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
                    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
                    const slug = baseSlug ? `${baseSlug}-${randomSuffix}` : `store-${userId.slice(0, 8)}`;

                    await supabase.from('stores').insert({
                        owner_id: userId,
                        name: storeName,
                        slug,
                        description: `Welcome to ${storeName}!`,
                        status: 'pending'
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

        // Auto-generate store for the approved seller
        try {
            const { data: existingStore } = await supabase
                .from('stores')
                .select('id')
                .eq('owner_id', user_id)
                .maybeSingle();

            if (!existingStore) {
                const businessName = application.business_name || 'My Store';
                const baseSlug = businessName.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
                const randomSuffix = Math.floor(1000 + Math.random() * 9000);
                const slug = baseSlug ? `${baseSlug}-${randomSuffix}` : `store-${user_id.slice(0, 8)}`;

                const { error: storeError } = await supabase.from('stores').insert({
                    owner_id: user_id,
                    name: businessName,
                    slug: slug,
                    description: `Welcome to ${businessName}!`,
                    status: 'approved'
                });

                if (storeError) {
                    console.error('[APPROVE_SELLER] Failed to create store:', storeError.message);
                } else {
                    console.log(`[APPROVE_SELLER] Store auto-created for seller ${user_id}: ${slug}`);
                }
            }
        } catch (storeCreateErr) {
            console.error('[APPROVE_SELLER] Store creation catch-block error:', storeCreateErr.message);
        }

        res.status(200).json({ success: true, data });

        // Fire-and-forget approval email
        const applicantEmail = application.email;
        const applicantName = application.full_name || 'Seller';
        const businessName = application.business_name || 'your business';
        sendEmail({
            to: applicantEmail,
            subject: 'Your Hilgod Seller Application Has Been Approved',
            html: sellerApprovedHtml(applicantName, businessName),
            emailType: 'seller_approval',
            userId: user_id,
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

// ── Rider Applications ────────────────────────────────────────────────────────

router.get('/riders', verifyToken, requireAdmin, async (req, res, next) => {
    try {
        const status = req.query.status || null;
        let query = supabase.from('rider_applications').select('*').order('applied_at', { ascending: false });
        if (status) query = query.eq('status', status);
        const { data, error } = await query;
        if (error) throw error;
        res.status(200).json({ success: true, data: data || [] });
    } catch (err) { next(err); }
});

router.put('/riders/:id', verifyToken, requireAdmin, async (req, res, next) => {
    try {
        const { id } = req.params;
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

        // Notify applicant by email
        if (status === 'approved') {
            const { sendEmail } = require('../services/email');
            sendEmail({
                to: data.email,
                subject: 'Your Hilgod Rider Application Has Been Approved!',
                html: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto">
                  <h2 style="color:#E31C1C">Congratulations, ${data.full_name}!</h2>
                  <p>Your application to join Hilgod's delivery fleet has been <strong>approved</strong>.</p>
                  <p>Our onboarding team will reach out to you at <strong>${data.phone}</strong> within 24 hours to get you started.</p>
                </div>`,
                emailType: 'rider_approval',
                userId: user_id,
            }).catch(() => {});
        } else if (status === 'rejected') {
            const { sendEmail } = require('../services/email');
            sendEmail({
                to: data.email,
                subject: 'Update on Your Hilgod Rider Application',
                html: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto">
                  <h2 style="color:#333">Application Update</h2>
                  <p>Hi ${data.full_name}, unfortunately your rider application was not successful at this time.</p>`,
                emailType: 'rider_rejection',
                userId: user_id,
                  ${admin_notes ? `<p><strong>Reason:</strong> ${admin_notes}</p>` : ''}
                  <p>You are welcome to reapply in the future. Email <a href="mailto:hilgodonline@gmail.com">hilgodonline@gmail.com</a> if you have questions.</p>
                </div>`,
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

module.exports = router;
