const express = require('express');
const router = express.Router();
const stripe = require('../config/stripe');
const supabase = require('../config/supabase');
const { verifyToken } = require('./auth');
const { handlePaymentSuccess } = require('../services/paymentSuccess');
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
          .select('id, total_amount, user_id, currency')
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

    const amount = Number(order.total_amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid order amount' });
    }

    // Charge in the order's own currency (stored at checkout). All orders are
    // created in NGN today, so this charges NGN — matching Paystack. An optional
    // STRIPE_CURRENCY env can override only if a deployment needs to force one.
    const { cleanEnv: _ce } = require('../lib/env');
    const stripeCurrency = (_ce(process.env.STRIPE_CURRENCY) || order.currency || 'ngn').toLowerCase();

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

      const { data: dbOrder, error: dbOrderErr } = await supabase
        .from('orders')
        .select('id, user_id, total_amount, payment_reference, status')
        .eq('id', order_id)
        .single();
      if (dbOrderErr || !dbOrder) throw dbOrderErr || new Error('Order not found for Stripe webhook');

      const paidAmount = Number(pi.amount_received || pi.amount || 0) / 100;
      const orderAmount = Number(dbOrder.total_amount || 0);
      if (!Number.isFinite(paidAmount) || Math.abs(paidAmount - orderAmount) > 0.01) {
        throw new Error(`Amount mismatch on Stripe webhook for order ${order_id}: paid=${paidAmount}, expected=${orderAmount}`);
      }

      // Atomically claim the paid transition (matches the Paystack path): only
      // the first caller to flip a not-yet-paid order to paid runs the one-time
      // side-effects, so stock decrement + emails stay exactly-once even if a
      // duplicate event slips past the idempotency barrier.
      const { data: claimed, error: claimErr } = await supabase
        .from('orders')
        .update({ status: 'paid', payment_reference: pi.id })
        .eq('id', order_id)
        .neq('status', 'paid')
        .select('id');
      if (claimErr) throw claimErr;
      if (!claimed || !claimed.length) {
        await supabase.from('payment_events').update({ processed_at: new Date().toISOString() }).eq('event_key', event.id);
        return res.sendStatus(200);
      }

      const userId = pi.metadata?.user_id || dbOrder.user_id;
      if (userId) {
        await supabase.from('cart_items').delete().eq('user_id', userId);
      }

      await handlePaymentSuccess(order_id, userId);

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
