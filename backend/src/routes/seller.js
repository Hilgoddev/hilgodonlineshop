const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { verifyToken } = require('./auth');

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

router.post('/apply', verifyToken, async (req, res, next) => {
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

    // Filter order_items at DB level using the seller's product IDs
    const productIds = (products || []).map((p) => p.id);
    let totalSales = 0;
    let totalUnits = 0;
    if (productIds.length > 0) {
      const { data: orderItems, error: oiErr } = await supabase
        .from('order_items')
        .select('quantity, unit_price')
        .in('product_id', productIds);
      if (oiErr) throw oiErr;
      totalSales = (orderItems || []).reduce((sum, it) => sum + Number(it.unit_price || 0) * Number(it.quantity || 0), 0);
      totalUnits = (orderItems || []).reduce((sum, it) => sum + Number(it.quantity || 0), 0);
    }

    res.status(200).json({
      success: true,
      data: {
        metrics: {
          productCount: (products || []).length,
          totalSales,
          totalUnits
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

    const productIds = (products || []).map((p) => p.id);
    const salesByProduct = {};
    if (productIds.length > 0) {
      const { data: orderItems, error: oiErr } = await supabase
        .from('order_items')
        .select('product_id, quantity, unit_price')
        .in('product_id', productIds);
      if (oiErr) throw oiErr;
      for (const item of orderItems || []) {
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
    const { data: products, error: pErr } = await supabase
      .from('products')
      .select('id, name, images')
      .eq('seller_id', req.user.id)
      .eq('is_active', true);
    if (pErr) throw pErr;

    const productIds = (products || []).map((p) => p.id);
    if (!productIds.length) return res.status(200).json({ success: true, data: [] });

    const { data: orderItems, error: oiErr } = await supabase
      .from('order_items')
      .select('order_id, product_id, quantity, unit_price')
      .in('product_id', productIds);
    if (oiErr) throw oiErr;

    const orderIds = [...new Set((orderItems || []).map((oi) => oi.order_id))];
    if (!orderIds.length) return res.status(200).json({ success: true, data: [] });

    const { data: orders, error: ordErr } = await supabase
      .from('orders')
      .select('id, user_id, total_amount, status, created_at, shipping_address')
      .in('id', orderIds)
      .order('created_at', { ascending: false });
    if (ordErr) throw ordErr;

    const buyerIds = [...new Set((orders || []).map((o) => o.user_id).filter(Boolean))];
    const { data: buyers } = buyerIds.length
      ? await supabase.from('profiles').select('id, full_name, username').in('id', buyerIds)
      : { data: [] };
    const buyerMap = new Map((buyers || []).map((b) => [b.id, b]));
    const productMap = new Map((products || []).map((p) => [p.id, p]));

    const itemsByOrder = (orderItems || []).reduce((map, oi) => {
      const list = map.get(oi.order_id) || [];
      const product = productMap.get(oi.product_id);
      list.push({
        productId: oi.product_id,
        name: product?.name || 'Product',
        image: product?.images?.[0] || null,
        quantity: Number(oi.quantity),
        price: Number(oi.unit_price),
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
        createdAt: o.created_at,
        buyer: {
          name: buyer?.full_name || buyer?.username || 'Customer',
          email: buyer?.username || '',
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

module.exports = router;
