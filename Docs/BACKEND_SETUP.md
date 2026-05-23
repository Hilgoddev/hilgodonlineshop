# Hilgod Online Shop - Backend Setup Guide

## 🎉 What Has Been Created

Your Next.js backend is now ready! Here's what I've built for you:

### ✅ Completed Features

1. **Next.js Server Setup** - Modern API server with TypeScript support
2. **MongoDB Integration** - Complete database connection with Mongoose ODM
3. **Google OAuth Authentication** - Ready for your Google Client ID/Secret
4. **Complete API Routes**:
   - Products (CRUD operations, search, filtering)
   - Cart (add, remove, view items)
   - Wishlist (add, remove, view items)
   - Orders (create, view, track orders)
   - User Management (registration, profile updates)
5. **Database Models**:
   - Users (with cart & wishlist)
   - Products (with reviews, ratings, categories)
   - Orders (with tracking, payment status)

## 📋 Next Steps - What You Need to Do

### Step 1: Install Dependencies

Open your terminal in the project folder and run:

```bash
npm install
```

### Step 2: Create Environment Variables File

1. Copy `.env.example` to `.env.local`:
   ```bash
   copy .env.example .env.local
   ```

2. Open `.env.local` and fill in your credentials (see below)

### Step 3: Get Your Google OAuth Credentials

I need you to provide:
- **Google Client ID**
- **Google Client Secret**

**How to get them:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable "Google+ API"
4. Go to "Credentials" → "Create Credentials" → "OAuth Client ID"
5. Set authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
6. Copy the Client ID and Client Secret

### Step 4: Set Up MongoDB

I need you to provide:
- **MongoDB Connection String**

**How to get it:**
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free cluster
3. Click "Connect" → "Connect your application"
4. Copy the connection string
5. Replace `<password>` with your database password

### Step 5: Generate Secret Keys

Run these commands to generate secure keys:

```bash
# For NEXTAUTH_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# For JWT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output and paste into `.env.local`

### Step 6: Start the Server

```bash
npm run dev
```

The server will start at `http://localhost:3000`

## 🔗 API Endpoints Available

### Health Check
- `GET /api/health` - Check if API is running

### Authentication
- `POST /api/auth/register` - Register new user
- `GET/POST /api/auth/[...nextauth]` - NextAuth endpoints (Google login, session)

### Products
- `GET /api/products` - Get all products (supports ?category, ?search, ?page, ?limit)
- `GET /api/products/:id` - Get single product
- `POST /api/products` - Create product (admin)
- `PUT /api/products/:id` - Update product (admin)
- `DELETE /api/products/:id` - Delete product (admin)

### Cart (Requires Authentication)
- `GET /api/cart` - Get user's cart
- `POST /api/cart` - Add item to cart
- `DELETE /api/cart/:productId` - Remove item from cart

### Wishlist (Requires Authentication)
- `GET /api/wishlist` - Get user's wishlist
- `POST /api/wishlist` - Add item to wishlist
- `DELETE /api/wishlist/:productId` - Remove item from wishlist

### Orders (Requires Authentication)
- `GET /api/orders` - Get user's orders
- `POST /api/orders` - Create new order
- `GET /api/orders/:id` - Get specific order

### User Profile (Requires Authentication)
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile

## 🧪 Testing the API

Once the server is running, you can test with these examples:

### Test Health Check
```bash
curl http://localhost:3000/api/health
```

### Test Product Listing
```bash
curl http://localhost:3000/api/products
```

### Test Registration
```bash
curl -X POST http://localhost:3000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"password123"}'
```

## 📁 Project Structure

```
hilgodonlineshop/
├── lib/
│   └── mongodb.js          # Database connection
├── models/
│   ├── User.js             # User model
│   ├── Product.js          # Product model
│   └── Order.js            # Order model
├── pages/
│   └── api/
│       ├── auth/
│       │   └── [...nextauth].js    # Authentication
│       ├── products/
│       │   ├── index.js            # Products CRUD
│       │   └── [id].js             # Single product
│       ├── cart/
│       │   ├── index.js            # Cart operations
│       │   └── [productId].js      # Remove from cart
│       ├── wishlist/
│       │   ├── index.js            # Wishlist operations
│       │   └── [productId].js      # Remove from wishlist
│       ├── orders/
│       │   ├── index.js            # Orders CRUD
│       │   └── [id].js             # Single order
│       ├── users/
│       │   ├── register.js         # User registration
│       │   └── profile.js          # User profile
│       └── health.js               # Health check
├── .env.example            # Environment variables template
├── .env.local              # Your actual secrets (create this)
├── package.json
├── next.config.js
└── tsconfig.json
```

## 🔐 Security Notes

1. **NEVER commit `.env.local`** to version control
2. Use strong passwords for MongoDB
3. Keep your Google Client Secret private
4. In production, use HTTPS
5. Change all secret keys before deploying

## 🚀 What's Next?

After you provide the credentials and get the server running:

1. **Frontend Integration** - Connect your existing HTML pages to the API
2. **Google Login Button** - Add "Sign in with Google" to your login page
3. **Product Data Migration** - Import your existing products to MongoDB
4. **Payment Integration** - Add Stripe/PayPal for payments
5. **Deploy to Production** - Deploy to Vercel, Railway, or similar

## ❓ Need Help?

When you're ready, provide me with:
1. ✅ Google Client ID
2. ✅ Google Client Secret
3. ✅ MongoDB Connection String
4. ✅ Generated secret keys

Then I'll help you:
- Configure everything properly
- Test the authentication
- Add sample products to database
- Connect your frontend pages

Let me know when you have the credentials ready! 🚀
