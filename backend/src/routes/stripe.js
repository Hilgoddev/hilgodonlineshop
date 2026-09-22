const express = require('express');
const router = express.Router();
const stripe = require('../config/stripe');
const supabase = require('../config/supabase');
const { verifyToken } = require('./auth');
const { markOrderPaid } = require('../services/paymentSuccess');
const { withTimeout } = require('../lib/resilience');

// POST /api/stripe/create-payment-intent
// Creates a Stripe PaymentIntent for an existing order. Amount is always sourced
// server-side from the order record to prevent tampering.
router.post('/create-payment-intent', verifyToken, async (req, res, next) => {
  try {
    const { cleanEnv } = require('../lib/env');
    const stripeKey = cleanEnv(process.env.STRIPE_SECRET_KEY) || '';
    const isValidKey = (stripeKey.startsWith('sk_live_') || stripeKey.startsWith('sk_test_')) && stripeKey.length > 50;
    if (!isValidKey) {
      return res.status(503).json({ success: false, message: 'Payments via Stripe is on the way. For now please try other options available.' });
    }

    const { order_id } = req.body;
    if (!order_id) {
      return res.status(400).json({ success: false, message: 'order_id is required' });
    }

    // Fetch order — 6s timeout so a cold Supabase never hangs the request.
    let order, error;
    try {
      ({ data: order, error } = await withTimeout(
        (signal) => supabase
          .from('orders')
          .select('id, total_amount, user_id, currency, status')
          .eq('id', order_id)
          .eq('user_id', req.user.id)
          .abortSignal(signal)
          .single(),
        6000,
      ));
    } catch (e) {
      return res.status(503).json({ success: false, message: 'Order service is slow right now. Please try again.' });
    }

    if (error || !order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    if (order.status !== 'pending') {
      return res.status(409).json({ success: false, message: 'This order is not awaiting payment.' });
    }

    const amount = Number(order.total_amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid order amount' });
    }

    // Always charge in the order's own currency (stored at checkout; NGN today).
    // The amount is in that currency's units, so charging any other currency
    // would bill the wrong sum — and the webhook would then refuse to apply it.
    const stripeCurrency = String(order.currency || 'ngn').toLowerCase();

    // amount is in major units; *100 gives minor units (kobo/cents).
    const paymentIntent = await withTimeout(
      () => stripe.paymentIntents.create({
        amount: Math.round(amount * 100),
        currency: stripeCurrency,
        automatic_payment_methods: { enabled: true },
        metadata: { order_id, user_id: req.user.id },
      }),
      8000,
    );

    // Respond immediately so the Stripe form renders fast. Persisting the
    // reference is best-effort (the webhook also stores it on success).
    res.json({ success: true, clientSecret: paymentIntent.client_secret, currency: stripeCurrency });

    supabase
      .from('orders')
      .update({ payment_reference: paymentIntent.id })
      .eq('id', order_id)
      .then(() => {}, (e) => console.warn('[STRIPE] reference save failed (non-fatal):', e?.message));
    return;
  } catch (err) {
    const type = err?.type || '';
    if (type === 'StripeAuthenticationError') {
      return res.status(503).json({ success: false, message: 'Stripe key is invalid. Please check your Stripe configuration.' });
    }
    if (type === 'StripeInvalidRequestError') {
      return res.status(400).json({ success: false, message: err.message || 'Stripe configuration error. Please try Paystack instead.' });
    }
    console.error('[STRIPE] create-payment-intent error:', err?.message);
    return res.status(502).json({ success: false, message: 'Stripe payment setup failed. Please use Paystack instead.' });
  }
});

// POST /api/stripe/webhook
// Stripe calls this on payment events. Signature verified with HMAC before processing.
// Raw body is required — index.js registers express.raw() for this path before express.json().
router.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const { cleanEnv: _clean } = require('../lib/env');
  const webhookSecret = _clean(process.env.STRIPE_WEBHOOK_SECRET);

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

    let ownsEvent = false;
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
      ownsEvent = true;

      // Same checks as Paystack: amount + currency, pending-only atomic claim.
      const result = await markOrderPaid({
        orderId: order_id,
        reference: pi.id,
        paidAmount: Number(pi.amount_received || pi.amount || 0) / 100,
        currency: pi.currency,
        provider: 'stripe',
      });
      if (!result.ok) console.error('[STRIPE] payment not applied:', result.reason, { order_id });

      await supabase
        .from('payment_events')
        .update({ processed_at: new Date().toISOString() })
        .eq('event_key', event.id);
    } catch (err) {
      console.error('[STRIPE] Webhook processing error:', err);
      // Release the idempotency row so Stripe's retry reprocesses the event.
      if (ownsEvent) {
        await supabase.from('payment_events').delete().eq('event_key', event.id).is('processed_at', null)
          .then(() => {}, (e) => console.error('[STRIPE] could not release event for retry:', e?.message));
      }
      return res.sendStatus(500);
    }
  }

  res.sendStatus(200);
});

module.exports = router;
