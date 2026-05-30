const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { verifyToken } = require('./auth');
const { sendEmail, orderConfirmationHtml, orderStatusHtml } = require('../services/email');

const mapOrder = (order, items = [], user = null) => ({
    _id: order.id,
    id: order.id,
    status: order.status,
    paymentStatus: order.status === 'paid' ? 'paid' : 'pending',
    totalAmount: Number(order.total_amount || 0),
    currency: order.currency,
    createdAt: order.created_at,
    updatedAt: order.updated_at,
    deliveryAddress: order.shipping_address || null,
    items,
    user
});

router.get('/', verifyToken, async (req, res, next) => {
    try {
        const { data: orders, error } = await supabase
            .from('orders')
            .select('*')
            .eq('user_id', req.user.id)
            .order('created_at', { ascending: false });
        if (error) throw error;

        const orderIds = (orders || []).map((o) => o.id);
        let itemMap = new Map();

        if (orderIds.length) {
            let { data: items, error: itemErr } = await supabase
                .from('order_items')
                .select('id, order_id, quantity, unit_price, fulfillment_status, seller_id, product:products(id, name, images), seller:profiles(id, full_name, phone_number), store:stores(name, logo_url)')
                .in('order_id', orderIds);
            if (itemErr && String(itemErr.message || '').includes('fulfillment_status')) {
                ({ data: items, error: itemErr } = await supabase
                    .from('order_items')
                    .select('id, order_id, quantity, unit_price, seller_id, product:products(id, name, images), seller:profiles(id, full_name, phone_number), store:stores(name, logo_url)')
                    .in('order_id', orderIds));
            }
            if (itemErr) throw itemErr;

            itemMap = (items || []).reduce((map, it) => {
                const list = map.get(it.order_id) || [];
                list.push({
                    id: it.id,
                    productId: it.product?.id || null,
                    name: it.product?.name || 'Product',
                    image: it.product?.images?.[0] || null,
                    price: Number(it.unit_price || 0),
                    quantity: it.quantity,
                    fulfillmentStatus: it.fulfillment_status || 'pending',
                    seller: it.seller ? {
                        id: it.seller.id,
                        name: it.seller.full_name || it.store?.name || 'Seller',
                        phone: it.seller.phone_number || null,
                        storeName: it.store?.name || null,
                        storeLogo: it.store?.logo_url || null
                    } : null
                });
                map.set(it.order_id, list);
                return map;
            }, new Map());
        }

        const data = (orders || []).map((o) => mapOrder(o, itemMap.get(o.id) || []));
        res.status(200).json({ success: true, data, pagination: { total: data.length } });
    } catch (err) {
        next(err);
    }
});

router.post('/', verifyToken, async (req, res, next) => {
    try {
        const { items = [], shippingAddress, paymentMethod } = req.body;

        if (!Array.isArray(items) || !items.length || !shippingAddress) {
            return res.status(400).json({ success: false, error: 'items and shippingAddress are required' });
        }

        const allowedPaymentMethods = ['stripe', 'paystack', 'opay', 'card', 'pod', 'bank_transfer'];
        if (!allowedPaymentMethods.includes(paymentMethod)) {
            return res.status(400).json({ success: false, error: 'Invalid paymentMethod' });
        }

        // Normalize payload:
        // - aggregate duplicate productIds
        // - cap per-line quantity
        // - require client-provided price to match DB price (tamper resistance)
        const maxDistinctItems = 100;
        const maxQuantityPerLine = 20;
        const EPS = 0.01;

        const productQuantityMap = new Map(); // productId -> quantity (aggregated)
        const productClientPriceMap = new Map(); // productId -> price provided by client (major units)

        for (const it of items) {
            const productId = it?.productId || it?.product_id;
            const quantity = Number(it?.quantity);
            const clientPrice = Number(it?.price);

            if (!productId) return res.status(400).json({ success: false, error: 'Each item must include productId' });
            if (!Number.isFinite(quantity) || quantity <= 0) {
                return res.status(400).json({ success: false, error: 'Each item must include a valid quantity' });
            }
            if (!Number.isInteger(quantity)) {
                return res.status(400).json({ success: false, error: 'quantity must be an integer' });
            }
            if (!Number.isFinite(clientPrice) || clientPrice < 0) {
                return res.status(400).json({ success: false, error: 'Each item must include a valid price' });
            }
            if (quantity > maxQuantityPerLine) {
                return res.status(400).json({ success: false, error: `Max quantity per line is ${maxQuantityPerLine}` });
            }

            productQuantityMap.set(productId, (productQuantityMap.get(productId) || 0) + quantity);

            // If duplicates come in with different unit prices, reject (ambiguous tamper attempt).
            if (productClientPriceMap.has(productId) && productClientPriceMap.get(productId) !== clientPrice) {
                return res.status(400).json({ success: false, error: 'Client price mismatch for duplicate item' });
            }
            productClientPriceMap.set(productId, clientPrice);
        }

        if (productQuantityMap.size > maxDistinctItems) {
            return res.status(400).json({ success: false, error: `Max distinct items per order is ${maxDistinctItems}` });
        }

        const productIds = [...productQuantityMap.keys()];
        const { data: products, error: productsErr } = await supabase
            .from('products')
            .select('id, name, images, price, stock, is_active, seller_id')
            .in('id', productIds);
        if (productsErr) throw productsErr;

        if (!products || products.length !== productIds.length) {
            return res.status(400).json({ success: false, error: 'One or more products are invalid' });
        }

        const productMap = new Map((products || []).map((p) => [p.id, p]));

        // Recompute totals from DB and validate stock.
        let total_amount = 0;
        const orderItems = [];
        const responseItems = [];

        for (const [productId, quantity] of productQuantityMap.entries()) {
            const p = productMap.get(productId);
            if (!p || p.is_active !== true) {
                return res.status(400).json({ success: false, error: `Product not available: ${productId}` });
            }
            if (quantity > maxQuantityPerLine) {
                // Aggregated duplicates can exceed the per-line cap.
                return res.status(400).json({ success: false, error: `Max quantity per line is ${maxQuantityPerLine}` });
            }
            if (!Number.isFinite(Number(p.stock)) || Number(p.stock) < quantity) {
                return res.status(409).json({ success: false, error: `Insufficient stock for product ${productId}` });
            }

            const serverUnitPrice = Number(p.price || 0);
            const clientUnitPrice = Number(productClientPriceMap.get(productId));

            if (!Number.isFinite(clientUnitPrice)) {
                return res.status(400).json({ success: false, error: `Missing/invalid price for product ${productId}` });
            }

            // Reject price tampering (major units). DB stores DECIMAL so rounding differences can exist.
            if (Math.abs(serverUnitPrice - clientUnitPrice) > EPS) {
                console.warn('[PRICE_TAMPERING] price mismatch', {
                    user_id: req.user.id,
                    product_id: productId,
                    serverUnitPrice,
                    clientUnitPrice,
                });
                return res.status(400).json({ success: false, error: 'Price mismatch detected' });
            }

            total_amount += serverUnitPrice * quantity;

            orderItems.push({
                product_id: productId,
                quantity,
                unit_price: serverUnitPrice,
                seller_id: p.seller_id || null, // Include seller_id from product
            });

            responseItems.push({
                productId,
                name: p.name || 'Product',
                image: p.images?.[0] || null,
                price: serverUnitPrice,
                quantity,
                sellerId: p.seller_id || null,
            });
        }

        // Add delivery fee server-side (free for orders strictly above ₦50,000).
        const DELIVERY_FEE = 1500;
        const deliveryFee = total_amount > 50000 ? 0 : DELIVERY_FEE;
        total_amount += deliveryFee;

        // Create order with server-computed total (products + delivery fee).
        const initialStatus = paymentMethod === 'pod' ? 'processing' : 'pending';
        const { data: orderRows, error: orderErr } = await supabase
            .from('orders')
            .insert([
                {
                    user_id: req.user.id,
                    total_amount,
                    currency: 'NGN',
                    status: initialStatus,
                    shipping_address: shippingAddress,
                },
            ])
            .select('*');
        if (orderErr) throw orderErr;

        const order = orderRows[0];

        const { error: itemErr } = await supabase
            .from('order_items')
            .insert(
                orderItems.map((it) => ({
                    order_id: order.id,
                    product_id: it.product_id,
                    quantity: it.quantity,
                    unit_price: it.unit_price,
                    seller_id: it.seller_id, // Include seller_id from product
                })),
            );
        if (itemErr) throw itemErr;

        const response = mapOrder(order, responseItems);
        res.status(201).json({ success: true, data: response });

        // Fire-and-forget — don't await, don't block the response
        sendEmail({
            to: req.user.email,
            subject: `Order Confirmed — Hilgod #${order.id.slice(0,8).toUpperCase()}`,
            html: orderConfirmationHtml(order.id, responseItems, total_amount),
            emailType: 'order_confirmation',
            orderId: order.id,
            userId: req.user.id,
        }).catch(() => {});
    } catch (err) {
        next(err);
    }
});

router.get('/all', verifyToken, async (req, res, next) => {
    try {
        const { data: me, error: meErr } = await supabase.from('profiles').select('role').eq('id', req.user.id).single();
        if (meErr || !me || me.role !== 'admin') return res.status(403).json({ success: false, error: 'Admin access required' });

        const { data: orders, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
        if (error) throw error;

        const userIds = [...new Set((orders || []).map((o) => o.user_id).filter(Boolean))];
        const orderIds = (orders || []).map((o) => o.id);

        const [{ data: profiles }] = await Promise.all([
            userIds.length ? supabase.from('profiles').select('id, full_name, username').in('id', userIds) : Promise.resolve({ data: [] }),
        ]);
        let items = [];
        if (orderIds.length) {
            let itemErr;
            ({ data: items, error: itemErr } = await supabase
                .from('order_items')
                .select('id, order_id, quantity, unit_price, fulfillment_status, seller_id, product:products(name, images, seller:profiles(id, full_name, phone_number), store:stores(name, logo_url))')
                .in('order_id', orderIds));
            if (itemErr && String(itemErr.message || '').includes('fulfillment_status')) {
                ({ data: items, error: itemErr } = await supabase
                    .from('order_items')
                    .select('id, order_id, quantity, unit_price, seller_id, product:products(name, images, seller:profiles(id, full_name, phone_number), store:stores(name, logo_url))')
                    .in('order_id', orderIds));
            }
            if (itemErr) throw itemErr;
        }

        const userMap = new Map((profiles || []).map((p) => {
            const names = (p.full_name || '').split(' ');
            return [p.id, { firstName: names[0] || p.username || 'User', lastName: names.slice(1).join(' ') || '', email: p.username || '' }];
        }));
        const itemMap = (items || []).reduce((map, it) => {
            const list = map.get(it.order_id) || [];
            list.push({
                id: it.id,
                name: it.product?.name || 'Product',
                image: it.product?.images?.[0] || null,
                price: Number(it.unit_price || 0),
                quantity: it.quantity,
                fulfillmentStatus: it.fulfillment_status || 'pending',
                seller: it.product?.seller ? {
                    id: it.product.seller.id,
                    name: it.product.seller.full_name || it.product.store?.name || 'Seller',
                    phone: it.product.seller.phone_number || null,
                    storeName: it.product.store?.name || null,
                    storeLogo: it.product.store?.logo_url || null
                } : null
            });
            map.set(it.order_id, list);
            return map;
        }, new Map());

        const data = (orders || []).map((o) => mapOrder(o, itemMap.get(o.id) || [], userMap.get(o.user_id) || null));
        const totalRevenue = data.reduce((sum, o) => sum + (o.status === 'paid' || o.status === 'delivered' ? o.totalAmount : 0), 0);
        res.status(200).json({ success: true, data, totalRevenue, pagination: { total: data.length } });
    } catch (err) {
        next(err);
    }
});

router.get('/:id', verifyToken, async (req, res, next) => {
    try {
        const id = req.params.id;
        let order = null;

        if (id.length < 36) {
            const { data: orders, error } = await supabase
                .from('orders')
                .select('*')
                .eq('user_id', req.user.id)
                .order('created_at', { ascending: false })
                .limit(200);
            if (error) throw error;
            order = (orders || []).find((o) => String(o.id).replace(/-/g, '').startsWith(id.replace(/-/g, '')));
        } else {
            const { data, error } = await supabase.from('orders').select('*').eq('id', id).maybeSingle();
            if (error) throw error;
            order = data;
        }

        if (!order) return res.status(404).json({ success: false, error: 'Order not found' });

        // Ownership check — only the order owner or an admin can view
        if (order.user_id !== req.user.id) {
            const { data: me } = await supabase.from('profiles').select('role').eq('id', req.user.id).single();
            if (!me || me.role !== 'admin') {
                return res.status(403).json({ success: false, error: 'Access denied' });
            }
        }

        let { data: items, error: itemsErr } = await supabase
            .from('order_items')
            .select('id, quantity, unit_price, fulfillment_status, seller_id, product:products(id, name, images, seller:profiles(id, full_name, phone_number), store:stores(name, logo_url))')
            .eq('order_id', order.id);
        if (itemsErr && String(itemsErr.message || '').includes('fulfillment_status')) {
            ({ data: items, error: itemsErr } = await supabase
                .from('order_items')
                .select('id, quantity, unit_price, seller_id, product:products(id, name, images, seller:profiles(id, full_name, phone_number), store:stores(name, logo_url))')
                .eq('order_id', order.id));
        }
        if (itemsErr) throw itemsErr;

        const mappedItems = (items || []).map((it) => ({
            id: it.id,
            productId: it.product?.id || null,
            name: it.product?.name || 'Product',
            image: it.product?.images?.[0] || null,
            price: Number(it.unit_price || 0),
            quantity: it.quantity,
            fulfillmentStatus: it.fulfillment_status || 'pending',
            seller: it.product?.seller ? {
                id: it.product?.seller?.id,
                name: it.product?.seller?.full_name || it.product?.store?.name || 'Seller',
                phone: it.product?.seller?.phone_number || null,
                storeName: it.product?.store?.name || null,
                storeLogo: it.product?.store?.logo_url || null
            } : null
        }));

        res.status(200).json({ success: true, data: mapOrder(order, mappedItems) });
    } catch (err) {
        next(err);
    }
});

router.put('/:id', verifyToken, async (req, res, next) => {
    try {
        const { data: me } = await supabase.from('profiles').select('role').eq('id', req.user.id).single();
        if (!me || me.role !== 'admin') return res.status(403).json({ success: false, error: 'Admin access required' });

        const { status } = req.body;
        const allowed = ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled'];
        if (!allowed.includes(status)) return res.status(400).json({ success: false, error: 'Invalid status' });

        const { data, error } = await supabase
            .from('orders')
            .update({ status })
            .eq('id', req.params.id)
            .select('*');
        if (error) throw error;
        if (!data?.length) return res.status(404).json({ success: false, error: 'Order not found' });

        res.status(200).json({ success: true, data: mapOrder(data[0]) });

        // Fire-and-forget status update email to buyer
        const updatedOrder = data[0];
        const orderId = updatedOrder.id;
        const newStatus = updatedOrder.status;
        if (updatedOrder.user_id) {
            supabase.from('profiles').select('email').eq('id', updatedOrder.user_id).single()
                .then(({ data: profile }) => {
                    if (profile?.email) {
                        sendEmail({
                            to: profile.email,
                            subject: `Order Update — Hilgod`,
                            html: orderStatusHtml(orderId, newStatus),
                            emailType: 'order_status',
                            orderId,
                            userId: updatedOrder.user_id,
                        }).catch(() => {});
                    }
                })
                .catch(() => {});
        }
    } catch (err) {
        next(err);
    }
});

module.exports = router;
