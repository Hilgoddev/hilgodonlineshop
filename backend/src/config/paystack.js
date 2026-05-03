require('dotenv').config();
const Paystack = require('paystack-api');

const paystackKey = process.env.PAYSTACK_SECRET_KEY;

let paystack;
if (paystackKey) {
    paystack = Paystack(paystackKey);
} else {
    console.warn('Missing PAYSTACK_SECRET_KEY. Ensure it is set in .env. Payment features will fail.');
    // Provide a dummy object to prevent startup crashes if key is missing
    paystack = {
        transaction: {
            initialize: async () => { throw new Error('Paystack not configured') },
            verify: async () => { throw new Error('Paystack not configured') }
        }
    };
}

module.exports = paystack;
