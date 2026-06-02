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
const { generalApiLimiter, adminApiLimiter, newsletterLimiter, deliveryLimiter } = require('./middleware/rateLimit');

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

// Basic DB connectivity route used by frontend system test page
app.get('/api/db-test', async (req, res, next) => {
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

// Error Handling Middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    const status = err.status || 500;
    const code = err.code || (status === 400 ? 'VALIDATION_FAILED' : 'INTERNAL_ERROR');
    const message = err.message || 'Internal Server Error';
    res.status(status).json({
        success: false,
        code,
        message,
        details: err.details || null,
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
