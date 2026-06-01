require('dotenv').config();
const { cleanEnv } = require('../lib/env');

const paystackKey = cleanEnv(process.env.PAYSTACK_SECRET_KEY);

let paystack;
try {
    const Paystack = require('paystack-api');

    if (paystackKey) {
        paystack = Paystack(paystackKey);
    } else {
        throw new Error('PAYSTACK_SECRET_KEY missing');
    }
} catch (err) {
    console.warn('Paystack not configured or package missing. Payment features will fail until configured.');
    paystack = {
        transaction: {
            initialize: async () => { throw new Error('Paystack not configured') },
            verify: async () => { throw new Error('Paystack not configured') }
        }
    };
}

module.exports = paystack;
