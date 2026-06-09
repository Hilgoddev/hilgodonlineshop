const REQUIRED_KEYS = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'PAYSTACK_SECRET_KEY',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'RESEND_API_KEY',
    'FRONTEND_URL',
];

function validateEnv() {
    const missing = REQUIRED_KEYS.filter(k => !process.env[k]);
    if (!missing.length) return;

    missing.forEach(k => console.warn(`[ENV] WARN: Missing environment variable: ${k}`));

    // In production a missing secret is a hard failure: booting anyway leads to
    // runtime errors (e.g. unverifiable webhooks, no DB access) that are far
    // harder to diagnose than a clear startup crash. In dev we only warn so the
    // app still runs with partial config.
    if (process.env.NODE_ENV === 'production') {
        throw new Error(`[ENV] Missing required environment variable(s): ${missing.join(', ')}`);
    }
}

module.exports = validateEnv;
