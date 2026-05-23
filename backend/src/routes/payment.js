const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const supabase = require('../config/supabase');
const paystack = require('../config/paystack');
const { verifyToken } = require('./auth');
const { paymentInitLimiter } = require('../middleware/rateLimit');
const { handlePaymentSuccess } = require('../services/paymentSuccess');

const initializePayment = async (req, res, next) => {
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

        const payerEmail = email || req.user?.email;
        if (!payerEmail) {
            return res.status(400).json({ success: false, message: 'A valid payer email is required' });
        }

        // Initialize Paystack transaction
        const frontendUrl = (process.env.FRONTEND_URL || 'https://hilgod.vercel.app').replace(/\/$/, '');
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
        
        // Save the payment reference to the order
        await supabase
            .from('orders')
            .update({ payment_reference: response.data.reference })
            .eq('id', order_id);
            
        res.status(200).json({ success: true, data: response.data });
    } catch (err) {
        next(err);
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
            
            // Update order status securely bypassing RLS (using service_role key configured in supabase.js)
            const { error } = await supabase
                .from('orders')
                .update({ status: 'paid' })
                .eq('id', webhookOrderId)
                .eq('payment_reference', reference);
                
            if (error) throw error;
            
            // Clear user's cart
            if (metadata?.user_id) {
                await supabase
                    .from('cart_items')
                    .delete()
                    .eq('user_id', metadata.user_id);
            }

            await handlePaymentSuccess(webhookOrderId, metadata?.user_id);
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
