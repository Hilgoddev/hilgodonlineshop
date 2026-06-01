const Stripe = require('stripe');
const { cleanEnv } = require('../lib/env');

const stripeSecretKey = cleanEnv(process.env.STRIPE_SECRET_KEY);

if (!stripeSecretKey) {
  console.warn('[STRIPE] STRIPE_SECRET_KEY not set — Stripe payments will fail');
}

module.exports = new Stripe(stripeSecretKey || '', {
  apiVersion: '2024-06-20',
});
