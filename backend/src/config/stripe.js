const Stripe = require('stripe');

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('[STRIPE] STRIPE_SECRET_KEY not set — Stripe payments will fail');
}

module.exports = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-06-20',
});
