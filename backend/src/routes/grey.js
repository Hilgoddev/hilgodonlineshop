const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const supabase = require('../config/supabase');
const { greyRequest } = require('../config/grey');
const { verifyToken } = require('./auth');
const { handlePaymentSuccess } = require('../services/paymentSuccess');

// POST /api/grey/create-payment
// Creates a Grey payment link for an existing order.
// Amount is always sourced server-side to prevent tampering.
router.post('/create-payment', verifyToken, async (req, res, next) => {
  try {
    const apiKey = process.env.GREY_API_KEY || '';
    if (!apiKey || apiKey === 'your-grey-api-key') {
      return res.status(503).json({
        success: false,
        message: 'Grey payments are not yet configured. Please try another payment method.',
      });
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

    // Create a Grey payment link
    // Docs: https://docs.grey.co — adjust endpoint/body to match Grey's API spec
    const payment = await greyRequest('POST', '/v1/payment-links', {
      amount,
      currency: 'NGN',
      reference: `ORD_${order_id}_${Date.now()}`,
      redirect_url: `${process.env.FRONTEND_URL || 'https://hilgod.com'}/checkout/success?order_id=${order_id}`,
      metadata: { order_id, user_id: req.user.id },
    });

    await supabase
      .from('orders')
      .update({ payment_reference: payment.data?.reference || payment.reference })
      .eq('id', order_id);

    res.json({
      success: true,
      data: {
        payment_url: payment.data?.payment_url || payment.payment_url,
        reference: payment.data?.reference || payment.reference,
      },
    });
  } catch (err) {
    if (err.status === 401) {
      return res.status(503).json({ success: false, message: 'Grey API key is invalid.' });
    }
    next(err);
  }
});

// POST /api/grey/webhook
// Grey calls this on payment events. Validate signature before processing.
// Raw body required — registered in index.js before express.json().
router.post('/webhook', async (req, res) => {
  const webhookSecret = process.env.GREY_WEBHOOK_SECRET;
  const sig = req.headers['x-grey-signature'] || req.headers['x-signature'];

  if (!webhookSecret || webhookSecret === 'your-grey-webhook-secret') {
    console.error('[GREY] GREY_WEBHOOK_SECRET not configured');
    return res.status(500).send('Webhook secret not configured');
  }

  // Verify HMAC signature (adjust header name to match Grey's docs)
  const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body || '');
  const computed = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
  if (!sig || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(computed))) {
    return res.status(400).send('Invalid signature');
  }

  let event;
  try {
    event = JSON.parse(rawBody.toString('utf8'));
  } catch {
    return res.status(400).send('Invalid JSON');
  }

  // Adjust event name to match Grey's actual webhook event types
  if (event.event === 'payment.completed' || event.event === 'payment.successful') {
    const reference = event.data?.reference;
    const order_id = event.data?.metadata?.order_id;

    if (!order_id || !reference) return res.sendStatus(200);

    try {
      // Idempotency barrier
      const { error: insertError } = await supabase
        .from('payment_events')
        .insert({
          provider: 'grey',
          event_name: event.event,
          event_key: event.id || `grey:${reference}`,
          reference,
          order_id,
          payload: event,
        });

      if (insertError?.code === '23505') return res.sendStatus(200);
      if (insertError) throw insertError;

      await supabase
        .from('orders')
        .update({ status: 'paid' })
        .eq('id', order_id)
        .eq('payment_reference', reference);

      const userId = event.data?.metadata?.user_id;
      if (userId) {
        await supabase.from('cart_items').delete().eq('user_id', userId);
      }

      await handlePaymentSuccess(order_id, userId);

      await supabase
        .from('payment_events')
        .update({ processed_at: new Date().toISOString() })
        .eq('event_key', event.id || `grey:${reference}`);
    } catch (err) {
      console.error('[GREY] Webhook processing error:', err);
      return res.sendStatus(500);
    }
  }

  res.sendStatus(200);
});

module.exports = router;
