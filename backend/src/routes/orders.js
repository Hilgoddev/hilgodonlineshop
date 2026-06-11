const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { verifyToken } = require('./auth');
const { sendEmail, orderConfirmationHtml, orderStatusHtml, escapeHtml, formatMoney } = require('../services/email');
const { cleanEnv } = require('../lib/env');
const BASE_URL = cleanEnv(process.env.FRONTEND_URL) || 'https://www.hilgod.com';
const { getActiveFlashSaleMap } = require('../utils/pricing');
const { withTimeout, makeCache, getEmailMap } = require('../lib/resilience');
const { isUuid } = require('../lib/validate');
const { REVENUE_STATUSES } = require('../lib/orderStatus');
const { optionsSummary } = require('../utils/colorName');
const ordersAllCache = makeCache({ ttlMs: 30 * 1000 });

// Effective per-item status for display. An item that's been individually
// advanced (packed/shipped/delivered) or cancelled keeps its own status;
// otherwise it mirrors the parent order's status so a paid/shipped/delivered
// order never shows "Item status: pending".
const effectiveItemStatus = (itemStatus, orderStatus) => {
    if (itemStatus && itemStatus !== 'pending') return itemStatus;
    return orderStatus || itemStatus || 'pending';
};

const mapOrder = (order, items = [], user = null) => {
    // Stored method when present; otherwise infer from the reference prefix for
    // legacy orders (Paystack refs start "ORD_", Stripe PaymentIntents "pi_").
    const paymentMethod = order.payment_method
        || (order.payment_reference?.startsWith('pi_') ? 'stripe'
            : order.payment_reference?.startsWith('ORD_') ? 'paystack'
            : null);
    const isPod = String(paymentMethod || '').toLowerCase() === 'pod';
    // POD is paid at delivery; online payments are paid once in a revenue status.
    const paymentStatus = isPod
        ? (order.status === 'delivered' ? 'paid' : 'pending')
        : (REVENUE_STATUSES.includes(order.status) ? 'paid' : 'pending');
    return {
        _id: order.id,
        id: order.id,
        status: order.status,
        paymentStatus,
        totalAmount: Number(order.total_amount || 0),
        currency: order.currency,
        createdAt: order.created_at,
        updatedAt: order.updated_at,
        deliveryAddress: order.shipping_address || null,
        paymentReference: order.payment_reference || null,
        paymentMethod,
        items: (items || []).map((it) => ({
            ...it,
            fulfillmentStatus: effectiveItemStatus(it.fulfillmentStatus, order.status),
        })),
        user   // { firstName, lastName, email, phone }
    };
};

// Seller email is stored on auth.users (not profiles), so resolve it via the
// admin API. Accepts one or more mapped-item lists, de-duplicates seller IDs
// across all of them, and attaches `seller.email` in place.
const attachSellerEmails = async (...itemsLists) => {
    const lists = itemsLists.flat().filter(Boolean);
    const ids = [...new Set(lists.flatMap((list) => list.map((it) => it.seller?.id)).filter(Boolean))];
    if (!ids.length) return;

    const entries = await Promise.all(ids.map(async (id) => {
        try {
            const { data } = await supabase.auth.admin.getUserById(id);
            return [id, data?.user?.email || null];
        } catch {
            return [id, null];
        }
    }));
    const emailMap = new Map(entries);

    for (const list of lists) {
        for (const it of list) {
            if (it.seller?.id) it.seller.email = emailMap.get(it.seller.id) || null;
        }
    }
};

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
                .select('id, order_id, quantity, unit_price, fulfillment_status, selected_options, seller_id, product:products(id, name, images, store:stores(name, logo_url)), seller:profiles(id, full_name, phone_number)')
                .in('order_id', orderIds);
            if (itemErr && (String(itemErr.message || '').includes('fulfillment_status') || String(itemErr.message || '').includes('selected_options'))) {
                ({ data: items, error: itemErr } = await supabase
                    .from('order_items')
                    .select('id, order_id, quantity, unit_price, seller_id, product:products(id, name, images, store:stores(name, logo_url)), seller:profiles(id, full_name, phone_number)')
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
                selectedOptions: it.selected_options || null,
                    seller: it.seller ? {
                        id: it.seller.id,
                        name: it.seller.full_name || it.product?.store?.name || 'Seller',
                        phone: it.seller.phone_number || null,
                        storeName: it.product?.store?.name || null,
                        storeLogo: it.product?.store?.logo_url || null
                    } : null
                });
                map.set(it.order_id, list);
                return map;
            }, new Map());
        }

        await attachSellerEmails([...itemMap.values()]);

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
        const productOptionsMap = new Map(); // productId -> { size, color, ... } selected variant

        // Keep only short string values for known/option keys, so a client can't
        // stuff arbitrary large data onto the order line.
        const sanitizeOptions = (raw) => {
            if (!raw || typeof raw !== 'object') return null;
            const clean = {};
            for (const [k, v] of Object.entries(raw)) {
                if (v == null) continue;
                const key = String(k).slice(0, 30);
                const val = String(v).trim().slice(0, 60);
                if (val) clean[key] = val;
            }
            return Object.keys(clean).length ? clean : null;
        };

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

            const opts = sanitizeOptions(it?.selectedOptions || it?.selected_options);
            if (opts && !productOptionsMap.has(productId)) productOptionsMap.set(productId, opts);
        }

        if (productQuantityMap.size > maxDistinctItems) {
            return res.status(400).json({ success: false, error: `Max distinct items per order is ${maxDistinctItems}` });
        }

        const productIds = [...productQuantityMap.keys()];

        // Run the two read queries in parallel and bound them with a hard
        // timeout. On the free-tier DB these can be slow; doing them serially
        // (plus the inserts below) can blow past the serverless time limit and
        // surface as an opaque platform 500. Failing fast with JSON lets the
        // client retry cleanly instead of crashing on a non-JSON error body.
        let products, productsErr, flashSaleMap;
        try {
            ([{ data: products, error: productsErr }, flashSaleMap] = await Promise.all([
                withTimeout(
                    (signal) => supabase
                        .from('products')
                        .select('id, name, images, price, stock, is_active, status, seller_id')
                        .in('id', productIds)
                        .abortSignal(signal),
                    8 * 1000,
                ),
                getActiveFlashSaleMap(productIds),
            ]));
        } catch (e) {
            console.error('[ORDERS] product/flash-sale lookup failed:', e?.message || e);
            return res.status(503).json({ success: false, error: 'Order service is busy. Please try again.' });
        }
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
            if (!p || p.is_active !== true || p.status !== 'approved') {
                return res.status(400).json({ success: false, error: `Product not available: ${productId}` });
            }
            if (quantity > maxQuantityPerLine) {
                // Aggregated duplicates can exceed the per-line cap.
                return res.status(400).json({ success: false, error: `Max quantity per line is ${maxQuantityPerLine}` });
            }
            if (!Number.isFinite(Number(p.stock)) || Number(p.stock) < quantity) {
                return res.status(409).json({ success: false, error: `Insufficient stock for product ${productId}` });
            }

            const flashSale = flashSaleMap.get(productId);
            const serverUnitPrice = flashSale ? Number(flashSale.sale_price || 0) : Number(p.price || 0);
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
                // Almost always a stale cart (e.g. a flash sale ended) rather than
                // tampering — tell the buyer clearly so they refresh instead of being
                // confused, and signal the client to reload current prices.
                return res.status(409).json({
                    success: false,
                    error: 'Some prices changed since you added these items (a sale may have ended). Please review your cart and try again.',
                    code: 'PRICE_CHANGED',
                });
            }

            total_amount += serverUnitPrice * quantity;

            orderItems.push({
                product_id: productId,
                quantity,
                unit_price: serverUnitPrice,
                seller_id: p.seller_id || null, // Include seller_id from product
                selected_options: productOptionsMap.get(productId) || null,
            });

            responseItems.push({
                productId,
                name: p.name || 'Product',
                image: p.images?.[0] || null,
                price: serverUnitPrice,
                quantity,
                sellerId: p.seller_id || null,
                selectedOptions: productOptionsMap.get(productId) || null,
            });
        }

        // Add delivery fee server-side (free for orders strictly above ₦50,000).
        const DELIVERY_FEE = 1500;
        const deliveryFee = total_amount > 50000 ? 0 : DELIVERY_FEE;
        total_amount += deliveryFee;

        // Create order with server-computed total (products + delivery fee).
        // All new orders start 'pending' (awaiting payment). 'processing' now means
        // "paid & being prepared", so a pay-on-delivery order must not jump there
        // before money is received — it stays pending until paid/delivered.
        const initialStatus = 'pending';
        const orderRow = {
            user_id: req.user.id,
            total_amount,
            currency: 'NGN',
            status: initialStatus,
            shipping_address: shippingAddress,
            payment_method: paymentMethod,
        };
        let orderRows, orderErr;
        try {
            ({ data: orderRows, error: orderErr } = await withTimeout(
                (signal) => supabase.from('orders').insert([orderRow]).select('*').abortSignal(signal),
                8 * 1000,
            ));
            // Backward-compat: if the payment_method column hasn't been added yet,
            // retry without it so order creation never breaks.
            if (orderErr && String(orderErr.message || '').includes('payment_method')) {
                const { payment_method, ...legacyRow } = orderRow;
                ({ data: orderRows, error: orderErr } = await withTimeout(
                    (signal) => supabase.from('orders').insert([legacyRow]).select('*').abortSignal(signal),
                    8 * 1000,
                ));
            }
        } catch (e) {
            console.error('[ORDERS] order insert failed:', e?.message || e);
            return res.status(503).json({ success: false, error: 'Order service is busy. Please try again.' });
        }
        if (orderErr) throw orderErr;

        const order = orderRows[0];

        // Insert order items — clean up order if this fails
        const baseRows = orderItems.map((it) => ({
            order_id:   order.id,
            product_id: it.product_id,
            quantity:   it.quantity,
            unit_price: it.unit_price,
            seller_id:  it.seller_id,
        }));
        const rowsWithOptions = orderItems.map((it, i) => ({ ...baseRows[i], selected_options: it.selected_options }));

        let { error: itemErr } = await supabase.from('order_items').insert(rowsWithOptions);
        // Backward-compat: if the selected_options column hasn't been added yet
        // (migration 012), retry without it so order creation never breaks.
        if (itemErr && String(itemErr.message || '').includes('selected_options')) {
            ({ error: itemErr } = await supabase.from('order_items').insert(baseRows));
        }
        if (itemErr) {
            await supabase.from('orders').delete().eq('id', order.id);
            throw itemErr;
        }

        // NOTE: Stock is NOT decremented here. Decrement happens only after a
        // successful payment in services/paymentSuccess.js (reserve-on-pay).
        // Decrementing at order creation would wrongly reduce stock for orders
        // that are abandoned before payment, and would double-count against the
        // payment-success decrement. Stock availability is still validated above.

        const response = mapOrder(order, responseItems);
        res.status(201).json({ success: true, data: response });

        // Fire-and-forget — don't await, don't block the response
        const leadName = responseItems[0]?.name || 'your items';
        const itemSummary = responseItems.length > 1 ? `${leadName} +${responseItems.length - 1} more` : leadName;
        sendEmail({
            to: req.user.email,
            subject: `Order Confirmed — ${itemSummary} (Hilgod #${order.id.slice(0,8).toUpperCase()})`,
            html: orderConfirmationHtml(order.id, responseItems, total_amount, order.currency),
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

        const parsedPage  = Math.max(1, Number(req.query.page)  || 1);
        const parsedLimit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
        const offset      = (parsedPage - 1) * parsedLimit;

        const cacheKey = `orders-all:${parsedPage}:${parsedLimit}`;
        const hit = ordersAllCache.get(cacheKey);
        if (hit && hit.fresh) return res.status(200).json(hit.value);

        const { data: orders, error, count } = await withTimeout(
            (signal) => supabase
                .from('orders')
                .select('*', { count: 'exact' })
                .order('created_at', { ascending: false })
                .range(offset, offset + parsedLimit - 1)
                .abortSignal(signal),
            12 * 1000,
        );
        if (error) throw error;

        const userIds = [...new Set((orders || []).map((o) => o.user_id).filter(Boolean))];
        const orderIds = (orders || []).map((o) => o.id);

        // Fetch profiles + auth emails (one batched listUsers call, cached 60s)
        // in parallel with order items. getEmailMap() is far cheaper than N
        // individual getUserById calls and won't threaten the 10s serverless limit.
        let profiles = [], authEmails = new Map();
        let items = [];
        await Promise.all([
            (async () => {
                if (!userIds.length) return;
                const [{ data }, emailMap] = await Promise.all([
                    supabase.from('profiles').select('id, full_name, username, phone_number').in('id', userIds),
                    getEmailMap(),
                ]);
                profiles = data || [];
                authEmails = emailMap;
            })(),
            (async () => {
                if (!orderIds.length) return;
                let itemErr;
                ({ data: items, error: itemErr } = await supabase
                    .from('order_items')
                    .select('id, order_id, quantity, unit_price, fulfillment_status, selected_options, seller_id, product:products(name, images, seller:profiles(id, full_name, phone_number), store:stores(name, logo_url))')
                    .in('order_id', orderIds));
                if (itemErr && (String(itemErr.message || '').includes('fulfillment_status') || String(itemErr.message || '').includes('selected_options'))) {
                    ({ data: items, error: itemErr } = await supabase
                        .from('order_items')
                        .select('id, order_id, quantity, unit_price, seller_id, product:products(name, images, seller:profiles(id, full_name, phone_number), store:stores(name, logo_url))')
                        .in('order_id', orderIds));
                }
                if (itemErr) throw itemErr;
            })(),
        ]);

        const userMap = new Map((profiles || []).map((p) => {
            const names = (p.full_name || '').split(' ');
            return [p.id, {
                firstName: names[0] || p.username || 'User',
                lastName: names.slice(1).join(' ') || '',
                email: authEmails.get(p.id) || p.username || '',
                phone: p.phone_number || '',
            }];
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
                selectedOptions: it.selected_options || null,
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

        await attachSellerEmails([...itemMap.values()]);

        const data = (orders || []).map((o) => mapOrder(o, itemMap.get(o.id) || [], userMap.get(o.user_id) || null));
        const totalRevenue = data.reduce((sum, o) => sum + (REVENUE_STATUSES.includes(o.status) ? o.totalAmount : 0), 0);
        const payload = { success: true, data, totalRevenue, pagination: { total: count || 0, page: parsedPage, limit: parsedLimit } };
        ordersAllCache.set(cacheKey, payload);
        return res.status(200).json(payload);
    } catch (err) {
        const hit = ordersAllCache.get(`orders-all:${Math.max(1, Number(req.query.page) || 1)}:${Math.min(200, Math.max(1, Number(req.query.limit) || 50))}`);
        if (hit) return res.status(200).json({ ...hit.value, stale: true });
        console.error('orders /all failed:', err?.message || err);
        return res.status(503).json({ success: false, error: 'Orders temporarily unavailable' });
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
            // Full-length id must be a valid uuid, else Postgres throws 22P02.
            if (!isUuid(id)) return res.status(404).json({ success: false, error: 'Order not found' });
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
            .select('id, quantity, unit_price, fulfillment_status, selected_options, seller_id, product:products(id, name, images, seller:profiles(id, full_name, phone_number), store:stores(name, logo_url))')
            .eq('order_id', order.id);
        if (itemsErr && (String(itemsErr.message || '').includes('fulfillment_status') || String(itemsErr.message || '').includes('selected_options'))) {
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
            selectedOptions: it.selected_options || null,
            seller: it.product?.seller ? {
                id: it.product?.seller?.id,
                name: it.product?.seller?.full_name || it.product?.store?.name || 'Seller',
                phone: it.product?.seller?.phone_number || null,
                storeName: it.product?.store?.name || null,
                storeLogo: it.product?.store?.logo_url || null
            } : null
        }));

        await attachSellerEmails([mappedItems]);

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

        // Read the previous status so we can detect the FIRST transition into a
        // paid state (e.g. admin confirming a bank-transfer/POD order). That is
        // the moment to decrement stock + notify sellers — which otherwise only
        // happens for online payments via the webhook/verify path.
        const { data: prev } = await supabase
            .from('orders').select('status').eq('id', req.params.id).single();

        const { data, error } = await supabase
            .from('orders')
            .update({ status })
            .eq('id', req.params.id)
            .select('*');
        if (error) throw error;
        if (!data?.length) return res.status(404).json({ success: false, error: 'Order not found' });

        // Cascade the order status to its line items' fulfillment_status so the
        // order modal / per-item views reflect the order's progress (no more
        // "Item status: pending" on a shipped order). Best-effort; ignore if the
        // column doesn't exist on an older schema.
        const ITEM_STATUS_BY_ORDER = { processing: 'packed', shipped: 'shipped', delivered: 'delivered', cancelled: 'cancelled' };
        const itemStatus = ITEM_STATUS_BY_ORDER[status];
        if (itemStatus) {
            const { error: itemErr } = await supabase
                .from('order_items')
                .update({ fulfillment_status: itemStatus })
                .eq('order_id', req.params.id);
            if (itemErr && !String(itemErr.message || '').includes('fulfillment_status')) {
                console.warn('[ORDERS] item-status cascade failed:', itemErr.message);
            }
        }

        // One-time paid-transition side effects (idempotent: only when crossing
        // from a non-paid status into a paid one).
        const PAID_SET = ['paid', 'shipped', 'delivered'];
        const wasPaid = prev && PAID_SET.includes(prev.status);
        const nowPaid = PAID_SET.includes(status);
        if (!wasPaid && nowPaid && data[0].user_id) {
            const { handlePaymentSuccess } = require('../services/paymentSuccess');
            handlePaymentSuccess(data[0].id, data[0].user_id).catch(() => {});
        }

        // Bust all page caches so the next admin fetch sees fresh data.
        for (let p = 1; p <= 10; p++) {
            for (const lim of [50, 100, 200]) ordersAllCache.delete(`orders-all:${p}:${lim}`);
        }

        res.status(200).json({ success: true, data: mapOrder(data[0]) });

        // Fire-and-forget status update email to buyer
        const updatedOrder = data[0];
        const orderId = updatedOrder.id;
        const newStatus = updatedOrder.status;
        if (updatedOrder.user_id) {
            Promise.all([
                supabase.auth.admin.getUserById(updatedOrder.user_id),
                supabase.from('order_items').select('quantity, selected_options, product:products(name)').eq('order_id', orderId),
            ])
                .then(([{ data: { user } }, { data: oi }]) => {
                    if (user?.email) {
                        const statusItems = (oi || []).map((r) => ({ name: r.product?.name || 'Product', quantity: r.quantity, selectedOptions: r.selected_options || null }));
                        const lead = statusItems[0]?.name || 'your order';
                        sendEmail({
                            to: user.email,
                            subject: `Order Update — ${lead}${statusItems.length > 1 ? ' +more' : ''} (Hilgod #${String(orderId).slice(0,8).toUpperCase()})`,
                            html: orderStatusHtml(orderId, newStatus, statusItems),
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

// POST /api/orders/:id/notify — admin sends a manual email to the customer
// Fetches full order details (items, total, address) and embeds them
// in a rich email alongside the admin's custom message.
router.post('/:id/notify', verifyToken, async (req, res, next) => {
    try {
        const { data: me } = await supabase.from('profiles').select('role').eq('id', req.user.id).single();
        if (!me || me.role !== 'admin') return res.status(403).json({ success: false, error: 'Admin access required' });

        const { subject, message } = req.body;
        if (!subject || !message) return res.status(400).json({ success: false, error: 'subject and message are required' });
        if (subject.length > 200) return res.status(400).json({ success: false, error: 'Subject too long' });
        if (message.length > 2000) return res.status(400).json({ success: false, error: 'Message too long (max 2000 chars)' });

        // Fetch full order + items + products in parallel
        const [{ data: order, error: orderErr }, { data: items }] = await Promise.all([
            supabase.from('orders')
                .select('id, user_id, status, total_amount, currency, shipping_address, created_at')
                .eq('id', req.params.id).single(),
            supabase.from('order_items')
                .select('quantity, unit_price, selected_options, product:products(name, images)')
                .eq('order_id', req.params.id),
        ]);
        if (orderErr || !order) return res.status(404).json({ success: false, error: 'Order not found' });

        const { data: { user } } = await supabase.auth.admin.getUserById(order.user_id);
        if (!user?.email) return res.status(400).json({ success: false, error: 'Customer email not found' });

        const customerName = escapeHtml(
            user.user_metadata?.full_name || user.user_metadata?.name || user.email.split('@')[0]
        );
        const orderId  = String(order.id).slice(0, 8).toUpperCase();
        const orderCurrency = String(order.currency || 'NGN').toUpperCase();
        const total    = formatMoney(Number(order.total_amount || 0), orderCurrency);
        const placed   = new Date(order.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' });
        const addr     = order.shipping_address || {};
        const addrLine = [addr.street, addr.city, addr.state, addr.country].filter(Boolean).join(', ');

        // Status badge colour
        const statusColors = { paid: '#0369a1', processing: '#1e40af', shipped: '#6d28d9', delivered: '#15803d', cancelled: '#b91c1c' };
        const statusBg     = { paid: '#e0f2fe', processing: '#dbeafe', shipped: '#ede9fe', delivered: '#dcfce7', cancelled: '#fee2e2' };
        const sc = statusColors[order.status] || '#92400e';
        const sb = statusBg[order.status]    || '#fef3c7';

        // Items table rows
        const itemRows = (items || []).map(it => {
            const name  = escapeHtml(it.product?.name || 'Product');
            const img   = it.product?.images?.[0] || '';
            const price = formatMoney(Number(it.unit_price || 0), orderCurrency);
            const line  = Number(it.unit_price || 0) * Number(it.quantity || 1);
            const lineF = formatMoney(line, orderCurrency);
            const opts  = optionsSummary(it.selected_options);
            const optsTag = opts ? `<div style="font-size:.78rem;color:#64748b;margin-top:2px">${escapeHtml(opts)}</div>` : '';
            const imgTag = img ? `<img src="${escapeHtml(img)}" alt="${name}" style="width:40px;height:40px;object-fit:cover;border-radius:6px;vertical-align:middle;margin-right:10px">` : '';
            return `<tr>
              <td style="padding:10px 8px;border-bottom:1px solid #f1f5f9;vertical-align:middle">${imgTag}${name}${optsTag}</td>
              <td style="padding:10px 8px;border-bottom:1px solid #f1f5f9;text-align:center;color:#64748b">${it.quantity}</td>
              <td style="padding:10px 8px;border-bottom:1px solid #f1f5f9;text-align:right;color:#64748b">${price}</td>
              <td style="padding:10px 8px;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:700">${lineF}</td>
            </tr>`;
        }).join('');

        const safeMessage = escapeHtml(message).replace(/\n/g, '<br>');

        const html = `<div style="font-family:sans-serif;max-width:580px;margin:0 auto;color:#1e293b">

          <!-- Greeting + message -->
          <h2 style="color:#E31C1C;margin-bottom:4px">Hi ${customerName},</h2>
          <div style="padding:16px 20px;background:#f8fafc;border-left:4px solid #E31C1C;border-radius:0 8px 8px 0;margin:14px 0 20px;line-height:1.8;font-size:.96rem">
            ${safeMessage}
          </div>

          <!-- Order meta -->
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px 20px;margin-bottom:20px">
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:10px">
              <span style="font-weight:800;font-size:1rem">Order #${orderId}</span>
              <span style="padding:4px 14px;border-radius:999px;font-size:.78rem;font-weight:700;background:${sb};color:${sc};text-transform:capitalize">${order.status || 'pending'}</span>
            </div>
            <div style="font-size:.82rem;color:#64748b">Placed on ${placed}</div>
          </div>

          <!-- Items table -->
          ${itemRows ? `<table style="width:100%;border-collapse:collapse;margin-bottom:8px;font-size:.88rem">
            <thead>
              <tr style="background:#f1f5f9;color:#64748b;font-size:.75rem;text-transform:uppercase;letter-spacing:.4px">
                <th style="padding:8px;text-align:left;font-weight:700">Product</th>
                <th style="padding:8px;text-align:center;font-weight:700">Qty</th>
                <th style="padding:8px;text-align:right;font-weight:700">Unit</th>
                <th style="padding:8px;text-align:right;font-weight:700">Total</th>
              </tr>
            </thead>
            <tbody>${itemRows}</tbody>
          </table>
          <div style="text-align:right;padding:10px 8px;font-size:1rem;font-weight:800;color:#E31C1C;border-top:2px solid #e2e8f0;margin-bottom:20px">
            Order Total: ${total}
          </div>` : ''}

          <!-- Delivery address -->
          ${addrLine ? `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px 18px;margin-bottom:20px;font-size:.88rem">
            <div style="font-size:.72rem;font-weight:700;text-transform:uppercase;color:#94a3b8;letter-spacing:.5px;margin-bottom:6px">📍 Delivery Address</div>
            <div style="font-weight:600">${escapeHtml(addrLine)}</div>
            ${addr.phone ? `<div style="color:#64748b;margin-top:3px">📞 ${escapeHtml(addr.phone)}</div>` : ''}
          </div>` : ''}

          <a href="${BASE_URL}/account?tab=orders" style="display:inline-block;padding:12px 28px;background:#E31C1C;color:#fff;text-decoration:none;border-radius:8px;font-weight:700;font-size:.95rem">View My Orders</a>
        </div>`;

        await sendEmail({
            to: user.email,
            subject,
            html,
            emailType: 'order_status',
            orderId: order.id,
            userId: order.user_id,
        });

        res.json({ success: true, message: `Email sent to ${user.email}` });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
