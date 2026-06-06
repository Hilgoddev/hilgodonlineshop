require('dotenv').config();
const validateEnv = require('./scripts/validateEnv');
validateEnv();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const crypto = require('crypto');
const { sendEmail, escapeHtml, newsletterConfirmHtml } = require('./services/email');
const { cleanEnv } = require('./lib/env');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
const allowedOrigins = (cleanEnv(process.env.FRONTEND_URL) || 'http://localhost:3000')
    .split(',').map(o => o.trim());
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
        callback(new Error('Not allowed by CORS'));
    },
    credentials: true
}));
// Webhooks require raw body before the global JSON parser runs
app.use('/api/payment/webhook', express.raw({ type: 'application/json' }));
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));
app.use('/api/grey/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Ensure req.body is always an object so `const { x } = req.body` in handlers
// never throws (e.g. a POST with text/plain or no body) — those should fall
// through to validation (400), not crash with a TypeError (500).
app.use((req, res, next) => { if (req.body === undefined || req.body === null) req.body = {}; next(); });
app.use(morgan('dev'));
app.use((req, res, next) => {
    req.requestId = req.headers['x-request-id'] || crypto.randomUUID();
    res.setHeader('x-request-id', req.requestId);
    next();
});

// Basic health check route
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'success', message: 'API is running successfully' });
});

// Import Routes
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const paymentRoutes = require('./routes/payment');
const { router: authRoutes } = require('./routes/auth');
const userRoutes = require('./routes/user');
const wishlistRoutes = require('./routes/wishlist');
const cartRoutes = require('./routes/cart');
const adminRoutes = require('./routes/admin');
const sellerRoutes = require('./routes/seller');
const categoryRoutes = require('./routes/categories');
const storeRoutes = require('./routes/stores');
const reviewRoutes = require('./routes/reviews');
const uploadRoutes = require('./routes/upload');
const stripeRoutes = require('./routes/stripe');
const greyRoutes = require('./routes/grey');
const flashSaleRoutes = require('./routes/flash-sales');
const exchangeRatesRoutes = require('./routes/exchange-rates');
const returnsRoutes = require('./routes/returns');
const supabase = require('./config/supabase');
const { generalApiLimiter, adminApiLimiter, newsletterLimiter, deliveryLimiter, writeLimiter } = require('./middleware/rateLimit');

// Apply Routes
app.use('/api', generalApiLimiter);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/admin', adminApiLimiter, adminRoutes);
app.use('/api/seller', sellerRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/stores', storeRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/stripe', stripeRoutes);
app.use('/api/grey', greyRoutes);
app.use('/api/flash-sales', flashSaleRoutes);
app.use('/api/exchange-rates', exchangeRatesRoutes);
app.use('/api/returns', returnsRoutes);

// Basic DB connectivity route used by the system-test page. Gated to non-production
// to avoid exposing infrastructure status publicly.
app.get('/api/db-test', async (req, res, next) => {
    if (process.env.NODE_ENV === 'production') {
        return res.status(404).json({ success: false, message: 'Not found' });
    }
    try {
        const { error } = await supabase.from('products').select('id').limit(1);
        if (error) throw error;
        res.status(200).json({ success: true, message: 'Database connection successful' });
    } catch (err) {
        next(err);
    }
});

app.post('/api/newsletter/subscribe', newsletterLimiter, async (req, res) => {
  const { email } = req.body;
  if (!email || !email.includes('@')) {
    return res.status(400).json({ success: false, error: 'Valid email required' });
  }
  // Save to DB (upsert so duplicate emails don't error)
  await supabase.from('newsletter_subscribers').upsert({ email, subscribed_at: new Date().toISOString() }, { onConflict: 'email' }).catch(() => {});
  sendEmail({
    to: email,
    subject: "You're subscribed to Hilgod updates!",
    html: newsletterConfirmHtml(email),
    emailType: 'newsletter',
  }).catch(() => {});
  // Notify admin
  if (process.env.ADMIN_EMAIL) {
    sendEmail({
      to: process.env.ADMIN_EMAIL,
      subject: `New newsletter subscriber: ${email}`,
      html: `<p><strong>${email}</strong> just subscribed to the Hilgod newsletter.</p>`,
      emailType: 'admin_alert',
    }).catch(() => {});
  }
  res.status(200).json({ success: true, message: 'Subscribed successfully' });
});

app.post('/api/delivery/apply', deliveryLimiter, async (req, res) => {
  const { fullName, phone, email, state, vehicleType, hasLicense, dateOfBirth } = req.body;
  if (!fullName || !phone || !email) {
    return res.status(400).json({ success: false, error: 'Name, phone and email are required' });
  }
  // Save application to database
  const { error: dbErr } = await supabase.from('rider_applications').insert({
    full_name: fullName,
    email,
    phone,
    state: state || null,
    vehicle_type: vehicleType || null,
    has_license: hasLicense === 'yes',
    date_of_birth: dateOfBirth || null,
    status: 'pending',
    applied_at: new Date().toISOString(),
  });
  if (dbErr) {
    console.error('[RIDER APPLY] DB error:', dbErr.message);
    return res.status(500).json({ success: false, error: 'Failed to save your application. Please try again.' });
  }

  const safeName        = escapeHtml(fullName);
  const safeEmail       = escapeHtml(email);
  const safePhone       = escapeHtml(phone);
  const safeState       = escapeHtml(state || 'N/A');
  const safeVehicle     = escapeHtml(vehicleType || 'N/A');
  const safeDob         = escapeHtml(dateOfBirth || 'N/A');
  const frontendUrl     = cleanEnv(process.env.FRONTEND_URL) || 'https://www.hilgod.com';

  // Notify admin by email
  sendEmail({
    to: process.env.ADMIN_EMAIL || email,
    subject: `New Delivery Partner Application — ${safeName}`,
    html: `<div style="font-family:sans-serif"><h2>New Delivery Application</h2>
      <p><strong>Name:</strong> ${safeName}</p>
      <p><strong>Email:</strong> ${safeEmail}</p>
      <p><strong>Phone:</strong> ${safePhone}</p>
      <p><strong>State:</strong> ${safeState}</p>
      <p><strong>Vehicle:</strong> ${safeVehicle}</p>
      <p><strong>Has License:</strong> ${hasLicense === 'yes' ? 'Yes' : 'No'}</p>
      <p><strong>DOB:</strong> ${safeDob}</p>
      <p><a href="${frontendUrl}/admin/riders" style="color:#E31C1C">View in Admin Panel</a></p>
    </div>`,
  }).catch(() => {});

  // Confirm to applicant
  sendEmail({
    to: email,
    subject: 'Hilgod Delivery Partner Application Received',
    html: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto">
      <h2 style="color:#E31C1C">Application Received!</h2>
      <p>Hi <strong>${safeName}</strong>, thank you for applying to join Hilgod's delivery fleet.</p>
      <p>Our team will review your application and contact you within <strong>48 hours</strong>.</p>
      <p style="color:#666">If you have any questions, email us at <a href="mailto:hilgodonline@gmail.com">hilgodonline@gmail.com</a></p>
    </div>`,
  }).catch(() => {});

  res.status(200).json({ success: true, message: 'Application received. We will contact you shortly.' });
});

// POST /api/careers/apply — saves application to DB and emails admin
app.post('/api/careers/apply', writeLimiter, async (req, res) => {
    const { fullName, email, phone, role, coverNote, cvLink } = req.body;
    if (!fullName || !email || !role) {
        return res.status(400).json({ success: false, error: 'Name, email and role are required' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ success: false, error: 'Invalid email address' });
    }

    const { error: dbErr } = await supabase.from('career_applications').insert({
        full_name: fullName,
        email,
        phone: phone || null,
        role_applied: role,
        cover_note: coverNote || null,
        cv_link: cvLink || null,
        status: 'new',
        applied_at: new Date().toISOString(),
    }).catch(() => ({ error: null })); // table may not exist yet — don't crash

    const safeName  = escapeHtml(fullName);
    const safeEmail = escapeHtml(email);
    const safeRole  = escapeHtml(role);
    const safeNote  = coverNote ? escapeHtml(coverNote) : null;
    const safeCV    = cvLink ? escapeHtml(cvLink) : null;
    const safePhone = phone ? escapeHtml(phone) : null;

    sendEmail({
        to: process.env.ADMIN_EMAIL || 'hilgodonline@gmail.com',
        subject: `New Career Application — ${safeRole} (${safeName})`,
        html: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto">
            <h2 style="color:#E31C1C">New Career Application</h2>
            <p><strong>Role:</strong> ${safeRole}</p>
            <p><strong>Name:</strong> ${safeName}</p>
            <p><strong>Email:</strong> <a href="mailto:${safeEmail}">${safeEmail}</a></p>
            ${safePhone ? `<p><strong>Phone:</strong> ${safePhone}</p>` : ''}
            ${safeNote ? `<p><strong>Cover Note:</strong></p><blockquote style="border-left:4px solid #E31C1C;margin:0;padding:8px 16px;background:#f8f8f8">${safeNote}</blockquote>` : ''}
            ${safeCV ? `<p><strong>CV / Portfolio:</strong> <a href="${safeCV}">${safeCV}</a></p>` : ''}
        </div>`,
        emailType: 'admin_alert',
    }).catch(() => {});

    sendEmail({
        to: email,
        subject: `Application Received — ${safeRole} at Hilgod`,
        html: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto">
            <h2 style="color:#E31C1C">Thank you, ${safeName}!</h2>
            <p>We've received your application for the <strong>${safeRole}</strong> position.</p>
            <p>Our team reviews every application personally. If your profile is a match we'll reach out within <strong>5 business days</strong>.</p>
            <p style="color:#666;font-size:.88rem">Questions? Reply to this email or contact us at <a href="mailto:hilgodonline@gmail.com" style="color:#E31C1C">hilgodonline@gmail.com</a></p>
        </div>`,
        emailType: 'general',
    }).catch(() => {});

    res.status(200).json({ success: true, message: 'Application submitted. We will be in touch soon!' });
});

// JSON 404 for any unmatched route (instead of Express's default HTML page).
app.use((req, res) => {
    res.status(404).json({ success: false, code: 'NOT_FOUND', message: 'Resource not found' });
});

// Error Handling Middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    const status = err.status || 500;
    const isProd = process.env.NODE_ENV === 'production';

    // Never leak raw DB/driver errors to clients on 5xx in production (the probe
    // found malformed input surfacing Postgres codes like 22P02 + an HTML page).
    // Client (4xx) messages are intentional/safe and kept as-is.
    const isServerError = status >= 500;
    const code = err.code || (status === 400 ? 'VALIDATION_FAILED' : 'INTERNAL_ERROR');
    const safeCode = isServerError && isProd ? 'INTERNAL_ERROR' : code;
    const message = isServerError && isProd
        ? 'Something went wrong. Please try again.'
        : (err.message || 'Internal Server Error');

    res.status(status).json({
        success: false,
        code: safeCode,
        message,
        details: isServerError && isProd ? null : (err.details || null),
        requestId: req.requestId || null,
        timestamp: new Date().toISOString(),
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
});

// Start Server (skipped when imported as a Vercel serverless function)
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    });
}

module.exports = app;
