const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { verifyToken } = require('./auth');
const { sendEmail } = require('../services/email');

const requireAdmin = async (req, res, next) => {
    try {
        const { data: profile, error } = await supabase.from('profiles').select('role').eq('id', req.user.id).single();
        if (error || !profile || profile.role !== 'admin') return res.status(403).json({ success: false, error: 'Admin access required' });
        next();
    } catch (err) { next(err); }
};

// POST /api/returns  — public, anyone can submit with order ID + email
router.post('/', async (req, res, next) => {
    try {
        const { orderId, email, reason, details } = req.body;

        if (!orderId || !email || !reason) {
            return res.status(400).json({ success: false, error: 'orderId, email, and reason are required' });
        }

        const { data, error } = await supabase
            .from('return_requests')
            .insert([{
                order_id: orderId.trim(),
                email: email.trim().toLowerCase(),
                reason,
                details: details || null,
                status: 'pending',
            }])
            .select()
            .single();

        if (error) throw error;

        // Notify admin
        if (process.env.ADMIN_EMAIL) {
            sendEmail({
                to: process.env.ADMIN_EMAIL,
                subject: `New Return Request — Order #${String(orderId).slice(0, 8).toUpperCase()}`,
                html: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto">
                  <h2 style="color:#E31C1C">New Return Request</h2>
                  <p><strong>Order ID:</strong> ${orderId}</p>
                  <p><strong>Customer Email:</strong> ${email}</p>
                  <p><strong>Reason:</strong> ${reason}</p>
                  ${details ? `<p><strong>Details:</strong> ${details}</p>` : ''}
                  <a href="${process.env.FRONTEND_URL || 'https://hilgod.com'}/admin/orders" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#E31C1C;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">View in Admin</a>
                </div>`,
                emailType: 'admin_alert',
            }).catch(() => {});
        }

        // Confirm to customer
        sendEmail({
            to: email,
            subject: `Return Request Received — Order #${String(orderId).slice(0, 8).toUpperCase()}`,
            html: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto">
              <h2 style="color:#E31C1C">We've received your return request</h2>
              <p>Hi, your return request for order <strong>#${String(orderId).slice(0, 8).toUpperCase()}</strong> has been submitted.</p>
              <p><strong>Reason:</strong> ${reason}</p>
              <p>Our support team will review your request and get back to you within 24 hours.</p>
              <p style="color:#666;font-size:.88rem">Questions? Email us at <a href="mailto:hilgodonline@gmail.com" style="color:#E31C1C">hilgodonline@gmail.com</a></p>
            </div>`,
            emailType: 'general',
        }).catch(() => {});

        res.status(201).json({ success: true, data });
    } catch (err) {
        next(err);
    }
});

// GET /api/returns  — admin only
router.get('/', verifyToken, requireAdmin, async (req, res, next) => {
    try {
        const { status } = req.query;
        let query = supabase
            .from('return_requests')
            .select('*')
            .order('created_at', { ascending: false });

        if (status && status !== 'all') query = query.eq('status', status);

        const { data, error } = await query;
        if (error) throw error;
        res.status(200).json({ success: true, data: data || [] });
    } catch (err) {
        next(err);
    }
});

// PATCH /api/returns/:id  — admin update status/notes
router.patch('/:id', verifyToken, requireAdmin, async (req, res, next) => {
    try {
        const { status, admin_notes } = req.body;
        const allowed = ['pending', 'approved', 'rejected', 'refunded'];
        if (status && !allowed.includes(status)) {
            return res.status(400).json({ success: false, error: 'Invalid status' });
        }

        const update = {};
        if (status) update.status = status;
        if (admin_notes !== undefined) update.admin_notes = admin_notes;

        const { data, error } = await supabase
            .from('return_requests')
            .update(update)
            .eq('id', req.params.id)
            .select()
            .single();

        if (error) throw error;
        res.status(200).json({ success: true, data });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
