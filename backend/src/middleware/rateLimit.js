const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = rateLimit;

const buildLimiter = ({ windowMs, max, message, keyGenerator }) =>
    rateLimit({
        windowMs,
        max,
        standardHeaders: true,
        legacyHeaders: false,
        keyGenerator,
        handler: (req, res) => {
            res.status(429).json({
                success: false,
                code: 'RATE_LIMITED',
                message,
                details: null,
                requestId: req.requestId || null,
                timestamp: new Date().toISOString(),
            });
        },
    });

// Auth routes: 5 requests / 15 minutes / IP
const authLimiter = buildLimiter({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: 'Too many authentication requests. Please try again later.',
});

// General API: 120 requests / minute / IP
const generalApiLimiter = buildLimiter({
    windowMs: 60 * 1000,
    max: 120,
    message: 'Too many API requests. Please try again later.',
});

// Admin routes: 60 requests / minute / IP
const adminApiLimiter = buildLimiter({
    windowMs: 60 * 1000,
    max: 60,
    message: 'Too many admin API requests. Please try again later.',
});

// Payment initiation: 10 requests / hour / authenticated user (fallback to IP)
const paymentInitLimiter = buildLimiter({
    windowMs: 60 * 60 * 1000,
    max: 10,
    message: 'Too many payment initialization requests. Please try again later.',
    keyGenerator: (req) => req.user?.id || ipKeyGenerator(req),
});

module.exports = {
    authLimiter,
    generalApiLimiter,
    adminApiLimiter,
    paymentInitLimiter,
};
