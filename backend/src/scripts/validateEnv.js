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
    if (missing.length) {
        missing.forEach(k => console.warn(`[ENV] WARN: Missing environment variable: ${k}`));
    }
}

module.exports = validateEnv;
