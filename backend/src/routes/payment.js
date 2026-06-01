const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const supabase = require('../config/supabase');
const paystack = require('../config/paystack');
const { verifyToken } = require('./auth');
const { paymentInitLimiter } = require('../middleware/rateLimit');
const { handlePaymentSuccess } = require('../services/paymentSuccess');

const initializePayment = async (req, res, next) => {
    const __t = Date.now();
    const __lap = (label) => { console.log(`[PAYMENT_TIMING] ${label}: +${Date.now() - __t}ms`); };
    try {
        const order_id = req.body.order_id || req.body.orderId;
        const email = req.body.email;
        const requestedAmount = Number(req.body.amount); // optional; used only as tamper signal

        if (!order_id) {
            return res.status(400).json({ success: false, message: 'order_id/orderId is required' });
        }

        // Ensure order belongs to user
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .select('*')
            .eq('id', order_id)
            .eq('user_id', req.user.id)
            .single();
        __lap('order fetched');

        if (orderError || !order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        const amount = Number(order.total_amount);
        if (!Number.isFinite(amount) || amount <= 0) {
            return res.status(400).json({ success: false, message: 'Order has invalid total amount' });
        }

        // Fraud signal: if client sends amount and it differs from server amount, reject.
        if (Number.isFinite(requestedAmount) && Math.abs(requestedAmount - amount) > 0.01) {
            console.warn('[PAYMENT_TAMPERING] initialize amount mismatch', {
                user_id: req.user.id,
                order_id,
                requestedAmount,
                serverAmount: amount,
            });
            return res.status(400).json({ success: false, message: 'Amount mismatch detected' });
        }

        // Sanitize: strip BOM/zero-width chars and whitespace from whichever
        // email source we use. A single invisible char causes Paystack 400.
        const sanitize = (s) => (s || '').replace(/[﻿​-‍⁠]/g, '').trim();
        const isValidEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

        // Try, in order: the email sent with the request, the email captured on
        // the order's shipping address at checkout, then the account email.
        const orderEmail = order?.shipping_address?.email;
        const payerEmail = [sanitize(email), sanitize(orderEmail), sanitize(req.user?.email)]
            .find(isValidEmail);

        if (!payerEmail) {
            console.error('[PAYMENT] No valid payer email', {
                order_id,
                bodyEmail: !!email,
                orderEmail: !!orderEmail,
                userEmail: !!req.user?.email,
            });
            return res.status(400).json({ success: false, message: 'A valid payer email is required' });
        }

        // Initialize Paystack transaction
        const frontendUrl = (process.env.FRONTEND_URL || 'https://hilgod.vercel.app').replace(/\/$/, '');
        __lap('before paystack.initialize');
        const response = await paystack.transaction.initialize({
            email: payerEmail,
            amount: amount * 100, // convert to subunits
            reference: `ORD_${order_id}_${Date.now()}`,
            callback_url: `${frontendUrl}/checkout`,
            metadata: {
                order_id: order_id,
                user_id: req.user.id
            }
        });
        __lap('paystack.initialize done');

        // Save the payment reference to the order
        await supabase
            .from('orders')
            .update({ payment_reference: response.data.reference })
            .eq('id', order_id);
        __lap('order updated + responding');

        res.status(200).json({ success: true, data: response.data });
    } catch (err) {
        // Paystack (via paystack-api / request-promise) throws a StatusCodeError
        // with the gateway's JSON in err.error. Surface a clean, actionable
        // message instead of a generic 500, and log enough to diagnose.
        const gateway = err?.error || err?.response?.body || null;
        const gatewayMsg = gateway?.message || err?.message;
        const masked = (s) => (s ? String(s).replace(/^(.).*(@.*)$/, '$1***$2') : '(none)');
        console.error('[PAYMENT] Paystack initialize failed:', {
            status: err?.statusCode || err?.status,
            gatewayMsg,
            payerEmail: masked(typeof payerEmail !== 'undefined' ? payerEmail : null),
        });
        return res.status(502).json({
            success: false,
            message: gatewayMsg || 'Payment gateway error. Please try again or use another method.',
        });
    }
};

// Initialize Payment (canonical)
router.post('/initialize', verifyToken, paymentInitLimiter, initializePayment);

// Backward-compatible alias used by current frontend
router.post('/initiate', verifyToken, paymentInitLimiter, initializePayment);

// Paystack Webhook endpoint
// Note: In index.js, we need to ensure this route uses express.raw({ type: 'application/json' }) 
// to properly verify the Paystack signature.
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const secret = process.env.PAYSTACK_SECRET_KEY || '';
    const signature = req.headers['x-paystack-signature'];
    const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body || '');

    if (!secret || typeof signature !== 'string') {
        return res.status(400).send('Missing signature configuration');
    }

    // Validate signature (timing-safe)
    const computed = crypto.createHmac('sha512', secret).update(rawBody).digest('hex');
    const sigBuf = Buffer.from(signature, 'utf8');
    const cmpBuf = Buffer.from(computed, 'utf8');
    if (sigBuf.length !== cmpBuf.length || !crypto.timingSafeEqual(sigBuf, cmpBuf)) {
        return res.status(400).send('Invalid signature');
    }

    // Parse the JSON event
    try {
        const event = JSON.parse(rawBody.toString('utf8'));
        const eventName = event?.event;
        const eventReference = event?.data?.reference || null;
        const order_id = event?.data?.metadata?.order_id || null;
        const eventKey = String(event?.data?.id || `${eventName || 'unknown'}:${eventReference || 'no-ref'}`);

        // Idempotency barrier: insert unique event key before processing.
        const { error: eventInsertError } = await supabase
            .from('payment_events')
            .insert({
                provider: 'paystack',
                event_name: eventName || 'unknown',
                event_key: eventKey,
                reference: eventReference,
                order_id,
                payload: event,
            });

        // Unique violation => already processed event (safe idempotent ack).
        if (eventInsertError?.code === '23505') {
            return res.sendStatus(200);
        }
        if (eventInsertError) throw eventInsertError;

        if (event.event === 'charge.success') {
            const { reference, metadata } = event.data;
            const webhookOrderId = metadata?.order_id;
            if (!webhookOrderId) throw new Error('Missing order_id in Paystack metadata');

            const { data: dbOrder, error: dbOrderErr } = await supabase
                .from('orders')
                .select('id, user_id, total_amount, payment_reference, status')
                .eq('id', webhookOrderId)
                .single();
            if (dbOrderErr || !dbOrder) throw dbOrderErr || new Error('Order not found for webhook');

            // Verify paid amount from gateway against order total to prevent mismatched order updates.
            const paidAmount = Number(event?.data?.amount || 0) / 100;
            const orderAmount = Number(dbOrder.total_amount || 0);
            if (!Number.isFinite(paidAmount) || Math.abs(paidAmount - orderAmount) > 0.01) {
                throw new Error(`Amount mismatch on webhook for order ${webhookOrderId}: paid=${paidAmount}, expected=${orderAmount}`);
            }

            // Mark paid by order_id and store final reference from gateway.
            const { error: updateErr } = await supabase
                .from('orders')
                .update({ status: 'paid', payment_reference: reference })
                .eq('id', webhookOrderId);
            if (updateErr) throw updateErr;
            
            // Clear user's cart
            const userId = metadata?.user_id || dbOrder.user_id;
            if (userId) {
                await supabase
                    .from('cart_items')
                    .delete()
                    .eq('user_id', userId);
            }

            await handlePaymentSuccess(webhookOrderId, userId);
        }

        await supabase
            .from('payment_events')
            .update({ processed_at: new Date().toISOString() })
            .eq('event_key', eventKey);
        
        res.sendStatus(200);
    } catch (err) {
        console.error('Webhook processing error:', err);
        res.sendStatus(500);
    }
});

// GET /api/payment/bank-details
// Returns bank account info from env vars. Client sets these when they onboard.
router.get('/bank-details', (req, res) => {
  res.json({
    success: true,
    data: {
      bankName: process.env.BANK_NAME || 'First Bank Nigeria',
      accountName: process.env.BANK_ACCOUNT_NAME || 'Hilgod Online Store Ltd',
      accountNumber: process.env.BANK_ACCOUNT_NUMBER || '0000000000',
      sortCode: process.env.BANK_SORT_CODE || '011',
    },
  });
});

module.exports = router;
