require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));
// Note: for Paystack webhooks, we need raw body parsing before JSON parsing.
app.use('/api/payment/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

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
const supabase = require('./config/supabase');

// Apply Routes
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/seller', sellerRoutes);

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

// Error Handling Middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal Server Error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
