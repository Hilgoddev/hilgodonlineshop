const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { verifyToken } = require('./auth');
const { getActiveFlashSaleMap, getEffectiveProductPricing } = require('../utils/pricing');

// Helper to get display store/seller info
// Priority: 1. Product's store, 2. Seller's store, 3. Seller name, 4. Hilgod Shop
const getStoreInfo = (p) => {
    // If product has a store, use it (this is the primary source)
    if (p.store && p.store.name) {
        return {
            id: p.store.id,
            name: p.store.name,
            slug: p.store.slug,
            status: p.store.status,
            logo_url: p.store.logo_url
        };
    }
    
    // If product has seller info, try to get seller's store
    if (p.seller_info) {
        // Check if seller has a store (from the seller_stores join)
        if (p.seller_info.store_name) {
            return {
                id: p.seller_info.store_id,
                name: p.seller_info.store_name,
                slug: p.seller_info.store_slug,
                status: p.seller_info.store_status || 'approved',
                logo_url: p.seller_info.store_logo_url
            };
        }
        // Fallback to seller's full name
        if (p.seller_info.full_name) {
            return {
                name: p.seller_info.full_name,
                slug: null,
                status: 'approved',
                logo_url: p.seller_info.avatar_url
            };
        }
    }
    
    // Only show "Hilgod Shop" if we have no other info (true admin products)
    return {
        name: 'Hilgod Shop',
        slug: 'hilgod-shop',
        status: 'approved',
        logo_url: null
    };
};

const mapProduct = (p, flashSale = null) => {
    const pricing = getEffectiveProductPricing(p, flashSale);
    return {
        ...p,
        _id: p.id,
        id: p.id,
        price: pricing.price,
        originalPrice: pricing.originalPrice,
        store: getStoreInfo(p),
    };
};

// GET /api/products
router.get('/', async (req, res, next) => {
    try {
        const { category, subcategory, search, seller_id, limit = 20, page = 1 } = req.query;
        const parsedLimit = Math.max(1, Number(limit) || 20);
        const parsedPage  = Math.max(1, Number(page)  || 1);

        // Query products with store and seller info
        // Also include seller's store via a separate query if needed
        let query = supabase
            .from('products')
            .select('*, store:stores(name, slug, status, logo_url), category_ref:categories(name, slug), seller:profiles(id, full_name, avatar_url)', { count: 'exact' })
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

        // If there are products, also fetch seller stores for products without direct store association
        if (data && data.length > 0) {
            // Get seller IDs for products without stores
            const sellersWithoutStores = data
                .filter(p => !p.store && p.seller_id)
                .map(p => p.seller_id)
                .filter((v, i, a) => a.indexOf(v) === i); // Unique seller IDs

            if (sellersWithoutStores.length > 0) {
                // Fetch stores for these sellers
                const { data: sellerStores } = await supabase
                    .from('stores')
                    .select('owner_id, id, name, slug, status, logo_url')
                    .in('owner_id', sellersWithoutStores)
                    .eq('status', 'approved');

                if (sellerStores) {
                    // Attach seller store info to products
                    const storeMap = new Map();
                    sellerStores.forEach(s => {
                        // Keep only the first store per seller (in case of multiples)
                        if (!storeMap.has(s.owner_id)) {
                            storeMap.set(s.owner_id, s);
                        }
                    });

                    data.forEach(p => {
                        if (!p.store && storeMap.has(p.seller_id)) {
                            const store = storeMap.get(p.seller_id);
                            p.seller_info = {
                                store_id: store.id,
                                store_name: store.name,
                                store_slug: store.slug,
                                store_status: store.status,
                                store_logo_url: store.logo_url,
                                full_name: p.seller?.full_name,
                                avatar_url: p.seller?.avatar_url
                            };
                        } else if (p.seller) {
                            p.seller_info = {
                                full_name: p.seller.full_name,
                                avatar_url: p.seller.avatar_url
                            };
                        }
                    });
                }
            } else if (data) {
                // Just attach seller info for products with stores
                data.forEach(p => {
                    if (p.seller) {
                        p.seller_info = {
                            full_name: p.seller.full_name,
                            avatar_url: p.seller.avatar_url
                        };
                    }
                });
            }
        }

        let flashSaleMap = new Map();
        try { flashSaleMap = await getActiveFlashSaleMap((data || []).map((p) => p.id)); } catch {}

        const payload = {
            success: true,
            data: (data || []).map((p) => mapProduct(p, flashSaleMap.get(p.id))),
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
        let flashSaleMap = new Map();
        try { flashSaleMap = await getActiveFlashSaleMap((data || []).map((p) => p.id)); } catch {}
        res.status(200).json({
            success: true,
            data: (data || []).map((p) => mapProduct(p, flashSaleMap.get(p.id))),
            pagination: { total: count }
        });
    } catch (err) {
        next(err);
    }
});

// GET /api/products/:id
router.get('/:id', async (req, res, next) => {
    try {
        const { data, error } = await supabase
            .from('products')
            .select('*, store:stores(name, slug, logo_url, status), category_ref:categories(name, slug), seller:profiles(id, full_name, avatar_url, phone_number)')
            .eq('id', req.params.id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return res.status(404).json({ success: false, error: 'Product not found' });
            }
            throw error;
        }

        // If product has no store but has a seller, fetch seller's store
        if (data && !data.store && data.seller_id) {
            const { data: sellerStore } = await supabase
                .from('stores')
                .select('id, name, slug, status, logo_url')
                .eq('owner_id', data.seller_id)
                .eq('status', 'approved')
                .single();

            if (sellerStore) {
                data.seller_info = {
                    store_id: sellerStore.id,
                    store_name: sellerStore.name,
                    store_slug: sellerStore.slug,
                    store_status: sellerStore.status,
                    store_logo_url: sellerStore.logo_url,
                    full_name: data.seller?.full_name,
                    avatar_url: data.seller?.avatar_url
                };
            } else if (data.seller) {
                data.seller_info = {
                    full_name: data.seller.full_name,
                    avatar_url: data.seller.avatar_url
                };
            }
        } else if (data && data.seller) {
            data.seller_info = {
                full_name: data.seller.full_name,
                avatar_url: data.seller.avatar_url
            };
        }

        let flashSaleMap = new Map();
        try { flashSaleMap = await getActiveFlashSaleMap([data.id]); } catch {}
        const payload = { success: true, data: mapProduct(data, flashSaleMap.get(data.id)) };
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
