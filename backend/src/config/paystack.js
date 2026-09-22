require('dotenv').config();
const { cleanEnv } = require('../lib/env');

// Minimal Paystack client over fetch. Replaces the unmaintained `paystack-api`
// package, which depended on the deprecated `request` library (critical npm
// advisories). Same shape as before: paystack.transaction.initialize(body)
// resolves to Paystack's JSON ({ status, message, data }) and rejects with an
// Error carrying `statusCode` and the gateway's JSON in `error`.
const PAYSTACK_BASE_URL = 'https://api.paystack.co';

async function paystackRequest(method, path, body) {
    const key = cleanEnv(process.env.PAYSTACK_SECRET_KEY);
    if (!key) throw new Error('Paystack not configured');

    const res = await fetch(`${PAYSTACK_BASE_URL}${path}`, {
        method,
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.status) {
        const err = new Error(json?.message || `Paystack API error ${res.status}`);
        err.statusCode = res.status;
        err.error = json;
        throw err;
    }
    return json;
}

if (!cleanEnv(process.env.PAYSTACK_SECRET_KEY)) {
    console.warn('Paystack not configured. Payment features will fail until PAYSTACK_SECRET_KEY is set.');
}

module.exports = {
    transaction: {
        initialize: (body) => paystackRequest('POST', '/transaction/initialize', body),
    },
};
