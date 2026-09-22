const Stripe = require('stripe');
const { cleanEnv } = require('../lib/env');

const stripeSecretKey = cleanEnv(process.env.STRIPE_SECRET_KEY);

if (!stripeSecretKey) {
  console.warn('[STRIPE] STRIPE_SECRET_KEY not set — Stripe payments will fail');
}

// Stripe is optional (.env.example: "leave blank to keep Stripe hidden"), but
// the SDK throws at construction without a key — which crashed the whole API on
// boot. Use an inert placeholder instead: /create-payment-intent refuses to run
// without a real key, and webhook signature checks don't use the API key.
module.exports = new Stripe(stripeSecretKey || 'sk_test_not_configured', {
  apiVersion: '2024-06-20',
});
