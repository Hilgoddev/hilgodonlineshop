const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { verifyToken } = require('./auth');
const requireAdmin = require('../middleware/requireAdmin');
const { sendEmail, escapeHtml } = require('../services/email');

// POST /api/returns — authenticated; verifies order ownership and email match
router.post('/', verifyToken, async (req, res, next) => {
    try {
        const { orderId, email, reason, details } = req.body;

        if (!orderId || !email || !reason) {
            return res.status(400).json({ success: false, error: 'orderId, email, and reason are required' });
        }

        // Fetch the order and verify it belongs to the authenticated user
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .select('id, user_id')
            .eq('id', orderId.trim())
            .maybeSingle();

        if (orderError) throw orderError;
        if (!order) return res.status(404).json({ success: false, error: 'Order not found' });
        if (order.user_id !== req.user.id) {
            return res.status(403).json({ success: false, error: 'Order does not belong to your account' });
        }

        // Verify supplied email matches the authenticated user's email
        if (req.user.email && email.trim().toLowerCase() !== req.user.email.toLowerCase()) {
            return res.status(400).json({ success: false, error: 'Email does not match your account' });
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

        const safeOrderId   = escapeHtml(String(orderId).slice(0, 8).toUpperCase());
        const safeEmail     = escapeHtml(email);
        const safeReason    = escapeHtml(reason);
        const safeDetails   = details ? escapeHtml(details) : null;
        const frontendUrl   = process.env.FRONTEND_URL || 'https://hilgod.com';

        // Notify admin
        if (process.env.ADMIN_EMAIL) {
            sendEmail({
                to: process.env.ADMIN_EMAIL,
                subject: `New Return Request — Order #${safeOrderId}`,
                html: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto">
                  <h2 style="color:#E31C1C">New Return Request</h2>
                  <p><strong>Order ID:</strong> ${safeOrderId}</p>
                  <p><strong>Customer Email:</strong> ${safeEmail}</p>
                  <p><strong>Reason:</strong> ${safeReason}</p>
                  ${safeDetails ? `<p><strong>Details:</strong> ${safeDetails}</p>` : ''}
                  <a href="${frontendUrl}/admin/orders" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#E31C1C;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">View in Admin</a>
                </div>`,
                emailType: 'admin_alert',
            }).catch(() => {});
        }

        // Confirm to customer
        sendEmail({
            to: email.trim().toLowerCase(),
            subject: `Return Request Received — Order #${safeOrderId}`,
            html: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto">
              <h2 style="color:#E31C1C">We've received your return request</h2>
              <p>Hi, your return request for order <strong>#${safeOrderId}</strong> has been submitted.</p>
              <p><strong>Reason:</strong> ${safeReason}</p>
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

// GET /api/returns — admin only
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

// PATCH /api/returns/:id — admin update status/notes
router.patch('/:id', verifyToken, requireAdmin, async (req, res, next) => {
    try {
        const { status, admin_notes } = req.body;
        const allowed = ['pending', 'approved', 'rejected', 'refunded'];
        if (status && !allowed.includes(status)) {
            return res.status(400).json({ success: false, error: 'Invalid status' });
        }

        // Read the current state first so we can detect the transition into a
        // stock-restoring status (approved/refunded) and avoid double-restoring.
        const { data: existing, error: existingErr } = await supabase
            .from('return_requests')
            .select('order_id, status')
            .eq('id', req.params.id)
            .maybeSingle();
        if (existingErr) throw existingErr;
        if (!existing) return res.status(404).json({ success: false, error: 'Return request not found' });

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

        // Restore stock when a return moves INTO approved/refunded from a state
        // outside that set. Returns are order-scoped here, so restore every item
        // of the order that was actually decremented (paid order) and not already
        // cancelled (cancellation restores its own stock in seller.js).
        const RESTORE_STATES = ['approved', 'refunded'];
        if (status && RESTORE_STATES.includes(status) && !RESTORE_STATES.includes(existing.status)) {
            const { data: ord } = await supabase
                .from('orders')
                .select('status')
                .eq('id', existing.order_id)
                .maybeSingle();
            if (ord && ['paid', 'shipped', 'delivered'].includes(ord.status)) {
                const { data: orderItems } = await supabase
                    .from('order_items')
                    .select('product_id, quantity, fulfillment_status')
                    .eq('order_id', existing.order_id);
                await Promise.allSettled(
                    (orderItems || [])
                        .filter((it) => it.fulfillment_status !== 'cancelled')
                        .map((it) => supabase.rpc('increment_product_stock', {
                            p_product_id: it.product_id,
                            p_quantity: it.quantity,
                        }))
                );
            }
        }

        res.status(200).json({ success: true, data });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
