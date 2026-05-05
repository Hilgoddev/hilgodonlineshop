const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { verifyToken } = require('./auth');

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
            const { data: items, error: itemErr } = await supabase
                .from('order_items')
                .select('order_id, quantity, unit_price, product:products(id, name, images)')
                .in('order_id', orderIds);
            if (itemErr) throw itemErr;

            itemMap = (items || []).reduce((map, it) => {
                const list = map.get(it.order_id) || [];
                list.push({
                    productId: it.product?.id || null,
                    name: it.product?.name || 'Product',
                    image: it.product?.images?.[0] || null,
                    price: Number(it.unit_price || 0),
                    quantity: it.quantity
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

        const total_amount = items.reduce((sum, it) => sum + (Number(it.price || 0) * Number(it.quantity || 0)), 0);
        const { data: orderRows, error: orderErr } = await supabase
            .from('orders')
            .insert([{
                user_id: req.user.id,
                total_amount,
                currency: 'NGN',
                status: paymentMethod === 'pod' ? 'processing' : 'pending',
                shipping_address: shippingAddress
            }])
            .select('*');
        if (orderErr) throw orderErr;

        const order = orderRows[0];
        const orderItems = items.map((it) => ({
            order_id: order.id,
            product_id: it.productId || null,
            quantity: Number(it.quantity || 1),
            unit_price: Number(it.price || 0)
        }));
        const { error: itemErr } = await supabase.from('order_items').insert(orderItems);
        if (itemErr) throw itemErr;

        const response = mapOrder(order, items.map((it) => ({
            productId: it.productId || null,
            name: it.name || 'Product',
            image: it.image || null,
            price: Number(it.price || 0),
            quantity: Number(it.quantity || 1)
        })));

        res.status(201).json({ success: true, data: response });
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

        const [{ data: profiles }, { data: items }] = await Promise.all([
            userIds.length ? supabase.from('profiles').select('id, full_name, username').in('id', userIds) : Promise.resolve({ data: [] }),
            orderIds.length ? supabase.from('order_items').select('order_id, quantity, unit_price, product:products(name, images)').in('order_id', orderIds) : Promise.resolve({ data: [] })
        ]);

        const userMap = new Map((profiles || []).map((p) => {
            const names = (p.full_name || '').split(' ');
            return [p.id, { firstName: names[0] || p.username || 'User', lastName: names.slice(1).join(' ') || '', email: p.username || '' }];
        }));
        const itemMap = (items || []).reduce((map, it) => {
            const list = map.get(it.order_id) || [];
            list.push({ name: it.product?.name || 'Product', image: it.product?.images?.[0] || null, price: Number(it.unit_price || 0), quantity: it.quantity });
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

router.get('/:id', async (req, res, next) => {
    try {
        const id = req.params.id;
        let order = null;

        if (id.length < 36) {
            const { data: orders, error } = await supabase
                .from('orders')
                .select('*')
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

        const { data: items } = await supabase
            .from('order_items')
            .select('quantity, unit_price, product:products(id, name, images)')
            .eq('order_id', order.id);

        const mappedItems = (items || []).map((it) => ({
            productId: it.product?.id || null,
            name: it.product?.name || 'Product',
            image: it.product?.images?.[0] || null,
            price: Number(it.unit_price || 0),
            quantity: it.quantity
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
    } catch (err) {
        next(err);
    }
});

module.exports = router;
