const rateLimit = require('express-rate-limit');

// General API Rate Limiter
const generalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many requests, please try again later.',
  },
});

// Admin API Rate Limiter
const adminApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit each IP to 50 requests per windowMs
  message: {
    success: false,
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many requests, please try again later.',
  },
});

// Payment initialization limiter — stricter window to reduce fraud attempts
const paymentInitLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: {
    success: false,
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many payment attempts, please try again later.',
  },
});

module.exports = { generalApiLimiter, adminApiLimiter, paymentInitLimiter };
