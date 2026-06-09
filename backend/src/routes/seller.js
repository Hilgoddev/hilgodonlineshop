const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { verifyToken } = require('./auth');
const { writeLimiter } = require('../middleware/rateLimit');
const { getEmailMap } = require('../lib/resilience');
const { REVENUE_STATUSES, PAYABLE_STATUSES } = require('../lib/orderStatus');

// Statuses that count as sales activity on dashboards (incl. 'processing').
const PAID_STATUSES = REVENUE_STATUSES;

// Given a list of order IDs, return a Set of those that are in a paid status.
async function getPaidOrderIdSet(orderIds = []) {
  const ids = [...new Set((orderIds || []).filter(Boolean))];
  if (!ids.length) return new Set();
  const { data } = await supabase
    .from('orders')
    .select('id')
    .in('id', ids)
    .in('status', PAID_STATUSES);
  return new Set((data || []).map((o) => o.id));
}

const requireSellerOrAdmin = async (req, res, next) => {
  try {
    const { data: profile, error } = await supabase.from('profiles').select('role').eq('id', req.user.id).single();
    if (error || !profile) return res.status(403).json({ success: false, error: 'Profile not found' });
    if (!['seller', 'admin'].includes(profile.role)) return res.status(403).json({ success: false, error: 'Seller access required' });
    req.userRole = profile.role;
    next();
  } catch (err) {
    next(err);
  }
};

router.post('/apply', verifyToken, writeLimiter, async (req, res, next) => {
  try {
    const { fullName, businessName, email, phone, businessCategory, monthlyRevenue } = req.body;
    if (!fullName || !businessName || !email || !phone) {
      return res.status(400).json({ success: false, error: 'Required fields missing' });
    }

    // Keep role unchanged until explicit admin approval.
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        full_name: fullName,
        phone_number: phone,
        address: {
          businessName,
          businessCategory: businessCategory || null,
          monthlyRevenue: monthlyRevenue || null
        }
      })
      .eq('id', req.user.id);
    if (profileError) throw profileError;

    // Create/update seller application with pending status.
    const { error: appError } = await supabase
      .from('seller_applications')
      .upsert({
        user_id: req.user.id,
        full_name: fullName,
        business_name: businessName,
        email,
        phone,
        business_category: businessCategory || null,
        monthly_revenue: monthlyRevenue || null,
        status: 'pending',
        reviewed_by: null,
        reviewed_at: null,
        admin_notes: null,
      }, { onConflict: 'user_id' });
    if (appError) throw appError;

    res.status(200).json({ success: true, message: 'Seller application submitted and pending admin approval' });
  } catch (err) {
    next(err);
  }
});

router.get('/application-status', verifyToken, async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('seller_applications')
      .select('*')
      .eq('user_id', req.user.id)
      .maybeSingle();
    if (error) throw error;
    res.status(200).json({ success: true, data: data || null });
  } catch (err) {
    next(err);
  }
});

router.get('/dashboard', verifyToken, requireSellerOrAdmin, async (req, res, next) => {
  try {
    const { data: products, error: pErr } = await supabase
      .from('products')
      .select('*')
      .eq('seller_id', req.user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    if (pErr) throw pErr;

    const { data: orderItems, error: oiErr } = await supabase
      .from('order_items')
      .select('order_id, quantity, unit_price')
      .eq('seller_id', req.user.id);
    if (oiErr) throw oiErr;

    const paidOrderIds = await getPaidOrderIdSet((orderItems || []).map((i) => i.order_id));
    const paidItems = (orderItems || []).filter((i) => paidOrderIds.has(i.order_id));

    const totalSales = paidItems.reduce((acc, i) => acc + (Number(i.unit_price) * Number(i.quantity)), 0);
    const totalUnits = paidItems.reduce((acc, i) => acc + Number(i.quantity), 0);
    const totalOrders = new Set(paidItems.map((i) => i.order_id)).size;
    // Return metrics including totalOrders
    res.status(200).json({
      success: true,
      data: {
        metrics: {
          productCount: (products || []).length,
          totalSales,
          totalRevenue: totalSales,
          totalUnits,
          totalOrders,
        },
        products: (products || []).map((p) => ({ ...p, _id: p.id, id: p.id, price: Number(p.price || 0) }))
      }
    });
  } catch (err) {
    next(err);
  }
});

router.get('/analytics', verifyToken, requireSellerOrAdmin, async (req, res, next) => {
  try {
    const { data: products, error: pErr } = await supabase
      .from('products')
      .select('id, name, category, price, stock, status, created_at')
      .eq('seller_id', req.user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    if (pErr) throw pErr;

    const salesByProduct = {};
    {
      const { data: orderItems, error: oiErr } = await supabase
        .from('order_items')
        .select('product_id, quantity, unit_price, order_id, seller_id')
        .eq('seller_id', req.user.id);
      if (oiErr) throw oiErr;
      // Only count items from PAID orders (payout-relevant — no unpaid inflation).
      const paidOrderIds = await getPaidOrderIdSet((orderItems || []).map((i) => i.order_id));
      for (const item of orderItems || []) {
        if (!paidOrderIds.has(item.order_id)) continue;
        if (!salesByProduct[item.product_id]) salesByProduct[item.product_id] = { sales: 0, units: 0 };
        salesByProduct[item.product_id].sales += Number(item.unit_price || 0) * Number(item.quantity || 0);
        salesByProduct[item.product_id].units += Number(item.quantity || 0);
      }
    }

    const totalSales = Object.values(salesByProduct).reduce((s, p) => s + p.sales, 0);
    const totalUnits = Object.values(salesByProduct).reduce((s, p) => s + p.units, 0);

    const topProducts = (products || [])
      .map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category,
        price: Number(p.price || 0),
        stock: Number(p.stock || 0),
        status: p.status,
        sales: salesByProduct[p.id]?.sales || 0,
        units: salesByProduct[p.id]?.units || 0,
      }))
      .sort((a, b) => b.sales - a.sales);

    const statusCounts = (products || []).reduce((acc, p) => {
      acc[p.status || 'pending'] = (acc[p.status || 'pending'] || 0) + 1;
      return acc;
    }, {});

    res.status(200).json({
      success: true,
      data: {
        metrics: {
          totalSales,
          totalUnits,
          productCount: (products || []).length,
          avgProductPrice: products?.length
            ? Math.round(products.reduce((s, p) => s + Number(p.price || 0), 0) / products.length)
            : 0,
        },
        topProducts,
        statusCounts,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/orders', verifyToken, requireSellerOrAdmin, async (req, res, next) => {
  try {
    let { data: orderItems, error: oiErr } = await supabase
      .from('order_items')
      .select('id, order_id, product_id, seller_id, quantity, unit_price, fulfillment_status, product:products(name, images)')
      .eq('seller_id', req.user.id);
    if (oiErr && String(oiErr.message || '').includes('fulfillment_status')) {
      ({ data: orderItems, error: oiErr } = await supabase
        .from('order_items')
        .select('id, order_id, product_id, seller_id, quantity, unit_price, product:products(name, images)')
        .eq('seller_id', req.user.id));
    }
    if (oiErr) throw oiErr;

    const orderIds = [...new Set((orderItems || []).map((oi) => oi.order_id))];
    if (!orderIds.length) return res.status(200).json({ success: true, data: [] });

    const { data: orders, error: ordErr } = await supabase
      .from('orders')
      .select('id, user_id, total_amount, status, created_at, shipping_address, currency')
      .in('id', orderIds)
      .order('created_at', { ascending: false });
    if (ordErr) throw ordErr;

    const buyerIds = [...new Set((orders || []).map((o) => o.user_id).filter(Boolean))];
    const [{ data: buyers }, emailMap] = buyerIds.length
      ? await Promise.all([
          supabase.from('profiles').select('id, full_name, username, phone_number').in('id', buyerIds),
          getEmailMap(),
        ])
      : [{ data: [] }, new Map()];
    const buyerMap = new Map((buyers || []).map((b) => [b.id, b]));
    const itemsByOrder = (orderItems || []).reduce((map, oi) => {
      const list = map.get(oi.order_id) || [];
      list.push({
        id: oi.id,
        productId: oi.product_id,
        name: oi.product?.name || 'Product',
        image: oi.product?.images?.[0] || null,
        quantity: Number(oi.quantity),
        price: Number(oi.unit_price),
        fulfillmentStatus: oi.fulfillment_status || 'pending',
      });
      map.set(oi.order_id, list);
      return map;
    }, new Map());

    const data = (orders || []).map((o) => {
      const buyer = buyerMap.get(o.user_id);
      const sellerItems = itemsByOrder.get(o.id) || [];
      return {
        id: o.id,
        status: o.status,
        totalAmount: Number(o.total_amount),
        currency: o.currency || 'NGN',
        createdAt: o.created_at,
        buyer: {
          name: buyer?.full_name || buyer?.username || 'Customer',
          email: emailMap.get(o.user_id) || buyer?.username || '',
          phone: buyer?.phone_number || '',
        },
        items: sellerItems,
        sellerTotal: sellerItems.reduce((s, i) => s + i.price * i.quantity, 0),
      };
    });

    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.patch('/order-items/:id/status', verifyToken, requireSellerOrAdmin, async (req, res, next) => {
  try {
    const itemId = req.params.id;
    const { fulfillmentStatus } = req.body || {};
    const allowed = ['pending', 'packed', 'shipped', 'delivered', 'cancelled'];
    if (!allowed.includes(fulfillmentStatus)) {
      return res.status(400).json({ success: false, error: 'Invalid fulfillmentStatus' });
    }

    const { data: item, error: itemErr } = await supabase
      .from('order_items')
      .select('id, order_id, product_id, quantity, fulfillment_status')
      .eq('id', itemId)
      .maybeSingle();
    if (itemErr) throw itemErr;
    if (!item) return res.status(404).json({ success: false, error: 'Order item not found' });

    // Ensure this item belongs to a product owned by the current seller/admin user.
    const { data: product, error: productErr } = await supabase
      .from('products')
      .select('id, seller_id')
      .eq('id', item.product_id)
      .maybeSingle();
    if (productErr) throw productErr;
    if (!product || (req.userRole !== 'admin' && product.seller_id !== req.user.id)) {
      return res.status(403).json({ success: false, error: 'Access denied for this order item' });
    }

    const { data: updatedItem, error: updateErr } = await supabase
      .from('order_items')
      .update({ fulfillment_status: fulfillmentStatus })
      .eq('id', itemId)
      .select('id, order_id, product_id, quantity, unit_price, fulfillment_status')
      .single();
    if (updateErr) throw updateErr;

    // Restore reserved stock when an item is cancelled. Stock is only decremented
    // on payment success (reserve-on-pay), so only restore for paid-through orders
    // and only on the transition INTO cancelled (guards against double-restore).
    if (fulfillmentStatus === 'cancelled' && item.fulfillment_status !== 'cancelled') {
      const { data: ord } = await supabase
        .from('orders')
        .select('status')
        .eq('id', item.order_id)
        .maybeSingle();
      if (ord && ['paid', 'shipped', 'delivered'].includes(ord.status)) {
        await supabase.rpc('increment_product_stock', {
          p_product_id: item.product_id,
          p_quantity: updatedItem.quantity,
        });
      }
    }

    // Best-effort: if all items are delivered/cancelled, bring order status in sync.
    const { data: allItems, error: allItemsErr } = await supabase
      .from('order_items')
      .select('fulfillment_status')
      .eq('order_id', item.order_id);
    if (!allItemsErr && allItems?.length) {
      const statuses = allItems.map((r) => r.fulfillment_status || 'pending');
      if (statuses.every((s) => s === 'delivered' || s === 'cancelled')) {
        const nextOrderStatus = statuses.every((s) => s === 'cancelled') ? 'cancelled' : 'delivered';
        await supabase.from('orders').update({ status: nextOrderStatus }).eq('id', item.order_id);
      } else if (statuses.some((s) => s === 'shipped' || s === 'delivered')) {
        await supabase.from('orders').update({ status: 'shipped' }).eq('id', item.order_id);
      } else if (statuses.some((s) => s === 'packed')) {
        await supabase.from('orders').update({ status: 'processing' }).eq('id', item.order_id);
      }
    }

    return res.status(200).json({ success: true, data: updatedItem });
  } catch (err) {
    next(err);
  }
});

// ── Seller Payouts ────────────────────────────────────────────────────────────

// GET /api/seller/earnings — available balance (total sales minus total withdrawn/approved)
router.get('/earnings', verifyToken, requireSellerOrAdmin, async (req, res, next) => {
  try {
    const { data: products } = await supabase
      .from('products').select('id').eq('seller_id', req.user.id);
    const productIds = (products || []).map(p => p.id);

    let grossEarnings = 0;
    if (productIds.length) {
      const { data: items } = await supabase
        .from('order_items')
        .select('quantity, unit_price, order:orders(status)')
        .in('product_id', productIds);
      grossEarnings = (items || [])
        .filter(i => PAYABLE_STATUSES.includes(i.order?.status))
        .reduce((s, i) => s + Number(i.unit_price) * Number(i.quantity), 0);
    }

    const { data: payouts } = await supabase
      .from('seller_payouts')
      .select('amount, status')
      .eq('seller_id', req.user.id)
      .in('status', ['approved', 'paid']);
    const withdrawn = (payouts || []).reduce((s, p) => s + Number(p.amount), 0);

    const { data: allPayouts } = await supabase
      .from('seller_payouts')
      .select('id, amount, status, payment_method, payment_details, requested_at, processed_at, admin_notes')
      .eq('seller_id', req.user.id)
      .order('requested_at', { ascending: false });

    // Saved bank details (reused to prefill the payout form). Tolerates the
    // columns not existing yet (before migration 009 is applied).
    let bankDetails = null;
    try {
      const { data: prof, error: profErr } = await supabase
        .from('profiles')
        .select('bank_name, bank_account_name, bank_account_number')
        .eq('id', req.user.id)
        .maybeSingle();
      if (!profErr && prof && (prof.bank_name || prof.bank_account_number)) {
        bankDetails = {
          bankName: prof.bank_name || '',
          accountName: prof.bank_account_name || '',
          accountNumber: prof.bank_account_number || '',
        };
      }
    } catch (_) { /* columns may not exist yet — non-fatal */ }

    res.json({
      success: true,
      data: {
        grossEarnings,
        withdrawn,
        available: Math.max(0, grossEarnings - withdrawn),
        payouts: allPayouts || [],
        bankDetails,
      },
    });
  } catch (err) { next(err); }
});

// POST /api/seller/payouts/request — seller requests a withdrawal
router.post('/payouts/request', verifyToken, requireSellerOrAdmin, async (req, res, next) => {
  try {
    const { amount, payment_method = 'bank_transfer', payment_details } = req.body;
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      return res.status(400).json({ success: false, error: 'A valid amount is required' });
    }

    // Verify sufficient available balance
    const { data: products } = await supabase
      .from('products').select('id').eq('seller_id', req.user.id);
    const productIds = (products || []).map(p => p.id);
    let grossEarnings = 0;
    if (productIds.length) {
      const { data: items } = await supabase
        .from('order_items')
        .select('quantity, unit_price, order:orders(status)')
        .in('product_id', productIds);
      grossEarnings = (items || [])
        .filter(i => PAYABLE_STATUSES.includes(i.order?.status))
        .reduce((s, i) => s + Number(i.unit_price) * Number(i.quantity), 0);
    }
    const { data: prevPayouts } = await supabase
      .from('seller_payouts').select('amount')
      .eq('seller_id', req.user.id).in('status', ['approved','paid']);
    const withdrawn = (prevPayouts || []).reduce((s, p) => s + Number(p.amount), 0);
    const available = Math.max(0, grossEarnings - withdrawn);

    if (amt > available) {
      return res.status(400).json({ success: false, error: `Requested amount exceeds available balance (₦${available.toLocaleString()})` });
    }

    const { data, error } = await supabase
      .from('seller_payouts')
      .insert({ seller_id: req.user.id, amount: amt, payment_method, payment_details: payment_details || null })
      .select().single();
    if (error) throw error;

    // Persist bank details on the profile so future requests can reuse them.
    // Best-effort: tolerates the columns not existing yet (migration 009).
    if (payment_details && (payment_details.bankName || payment_details.accountNumber)) {
      try {
        await supabase
          .from('profiles')
          .update({
            bank_name: payment_details.bankName || null,
            bank_account_name: payment_details.accountName || null,
            bank_account_number: payment_details.accountNumber || null,
          })
          .eq('id', req.user.id);
      } catch (_) { /* columns may not exist yet — non-fatal */ }
    }

    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
});

module.exports = router;
