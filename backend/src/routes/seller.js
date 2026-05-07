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

module.exports = router;
