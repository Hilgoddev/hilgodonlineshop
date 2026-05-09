require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const crypto = require('crypto');
const { sendEmail, newsletterConfirmHtml } = require('./services/email');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
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
const supabase = require('./config/supabase');
const { generalApiLimiter, adminApiLimiter } = require('./middleware/rateLimit');

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

app.post('/api/newsletter/subscribe', async (req, res) => {
  const { email } = req.body;
  if (!email || !email.includes('@')) {
    return res.status(400).json({ success: false, error: 'Valid email required' });
  }
  sendEmail({
    to: email,
    subject: "You're subscribed to Hilgod updates!",
    html: newsletterConfirmHtml(email),
  }).catch(() => {});
  res.status(200).json({ success: true, message: 'Subscribed successfully' });
});

app.post('/api/delivery/apply', async (req, res) => {
  const { fullName, phone, email, state, vehicleType, hasLicense, dateOfBirth } = req.body;
  if (!fullName || !phone || !email) {
    return res.status(400).json({ success: false, error: 'Name, phone and email are required' });
  }
  sendEmail({
    to: process.env.ADMIN_EMAIL || email,
    subject: `New Delivery Partner Application — ${fullName}`,
    html: `<div style="font-family:sans-serif"><h2>New Delivery Application</h2>
      <p><strong>Name:</strong> ${fullName}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Phone:</strong> ${phone}</p>
      <p><strong>State:</strong> ${state || 'N/A'}</p>
      <p><strong>Vehicle:</strong> ${vehicleType || 'N/A'}</p>
      <p><strong>Has License:</strong> ${hasLicense || 'N/A'}</p>
      <p><strong>DOB:</strong> ${dateOfBirth || 'N/A'}</p>
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
