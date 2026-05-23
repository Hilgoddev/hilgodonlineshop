const express = require('express');
const router = express.Router();
const stripe = require('../config/stripe');
const supabase = require('../config/supabase');
const { verifyToken } = require('./auth');
const { handlePaymentSuccess } = require('../services/paymentSuccess');

// POST /api/stripe/create-payment-intent
// Creates a Stripe PaymentIntent for an existing order. Amount is always sourced
// server-side from the order record to prevent tampering.
router.post('/create-payment-intent', verifyToken, async (req, res, next) => {
  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY || '';
    const isValidKey = (stripeKey.startsWith('sk_live_') || stripeKey.startsWith('sk_test_')) && stripeKey.length > 50;
    if (!isValidKey) {
      return res.status(503).json({ success: false, message: 'Payments via Stripe is on the way. For now please try other options available.' });
    }

    const { order_id } = req.body;
    if (!order_id) {
      return res.status(400).json({ success: false, message: 'order_id is required' });
    }

    const { data: order, error } = await supabase
      .from('orders')
      .select('id, total_amount, user_id')
      .eq('id', order_id)
      .eq('user_id', req.user.id)
      .single();

    if (error || !order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const amount = Number(order.total_amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid order amount' });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // NGN kobo
      currency: 'ngn',
      automatic_payment_methods: { enabled: true },
      metadata: { order_id, user_id: req.user.id },
    });

    await supabase
      .from('orders')
      .update({ payment_reference: paymentIntent.id })
      .eq('id', order_id);

    res.json({ success: true, clientSecret: paymentIntent.client_secret });
  } catch (err) {
    if (err?.type === 'StripeAuthenticationError') {
      return res.status(503).json({ success: false, message: 'Payments via Stripe is on the way. For now please try other options available.' });
    }
    next(err);
  }
});

// POST /api/stripe/webhook
// Stripe calls this on payment events. Signature verified with HMAC before processing.
// Raw body is required — index.js registers express.raw() for this path before express.json().
router.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('[STRIPE] STRIPE_WEBHOOK_SECRET not configured');
    return res.status(500).send('Webhook secret not configured');
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('[STRIPE] Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'payment_intent.succeeded') {
    const pi = event.data.object;
    const order_id = pi.metadata?.order_id;

    if (!order_id) return res.sendStatus(200);

    try {
      // Idempotency barrier — unique event_key prevents double-processing
      const { error: insertError } = await supabase
        .from('payment_events')
        .insert({
          provider: 'stripe',
          event_name: event.type,
          event_key: event.id,
          reference: pi.id,
          order_id,
          payload: event,
        });

      if (insertError?.code === '23505') return res.sendStatus(200);
      if (insertError) throw insertError;

      await supabase
        .from('orders')
        .update({ status: 'paid' })
        .eq('id', order_id)
        .eq('payment_reference', pi.id);

      if (pi.metadata?.user_id) {
        await supabase.from('cart_items').delete().eq('user_id', pi.metadata.user_id);
      }

      await handlePaymentSuccess(order_id, pi.metadata?.user_id);

      await supabase
        .from('payment_events')
        .update({ processed_at: new Date().toISOString() })
        .eq('event_key', event.id);
    } catch (err) {
      console.error('[STRIPE] Webhook processing error:', err);
      return res.sendStatus(500);
    }
  }

  res.sendStatus(200);
});

module.exports = router;
