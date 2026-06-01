const rateLimit = require('express-rate-limit');

const isDev = process.env.NODE_ENV !== 'production';

// General API Rate Limiter
const generalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 2000 : 500,
  message: {
    success: false,
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many requests, please try again later.',
  },
});

// Admin API Rate Limiter
const adminApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 1000 : 300,
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

// Newsletter subscription limiter — prevents email spam via our send path
const newsletterLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: isDev ? 100 : 5,
  message: {
    success: false,
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many subscription attempts, please try again later.',
  },
});

// Delivery partner application limiter
const deliveryLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: isDev ? 50 : 3,
  message: {
    success: false,
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many application attempts, please try again later.',
  },
});

module.exports = { generalApiLimiter, adminApiLimiter, paymentInitLimiter, newsletterLimiter, deliveryLimiter };
