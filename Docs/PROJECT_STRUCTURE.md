# Project Structure Overview

```
hilgodonlineshop/
│
├── 📁 Backend (NEW - Next.js API Server)
│   ├── 📁 lib/
│   │   └── mongodb.js                 # Database connection handler
│   │
│   ├── 📁 models/                     # MongoDB Schemas
│   │   ├── User.js                    # User model (with cart & wishlist)
│   │   ├── Product.js                 # Product model (with reviews)
│   │   └── Order.js                   # Order model (with tracking)
│   │
│   ├── 📁 pages/
│   │   └── 📁 api/                    # API Routes
│   │       ├── 📁 auth/
│   │       │   └── [...nextauth].js   # Google OAuth + Sessions
│   │       │
│   │       ├── 📁 products/
│   │       │   ├── index.js           # GET all, POST new product
│   │       │   └── [id].js            # GET/PUT/DELETE single product
│   │       │
│   │       ├── 📁 cart/
│   │       │   ├── index.js           # GET cart, POST add item
│   │       │   └── [productId].js     # DELETE remove item
│   │       │
│   │       ├── 📁 wishlist/
│   │       │   ├── index.js           # GET wishlist, POST add item
│   │       │   └── [productId].js     # DELETE remove item
│   │       │
│   │       ├── 📁 orders/
│   │       │   ├── index.js           # GET orders, POST new order
│   │       │   └── [id].js            # GET single order
│   │       │
│   │       ├── 📁 users/
│   │       │   ├── register.js        # POST register new user
│   │       │   └── profile.js         # GET/PUT user profile
│   │       │
│   │       └── health.js              # GET health check
│   │
│   ├── 📁 public/
│   │   └── api-test.html              # Interactive API testing page
│   │
│   ├── 📁 scripts/
│   │   └── seed-products.js           # Database seeding script
│   │
│   ├── .env.example                   # Environment variables template
│   ├── .env.local                     # Your secrets (create this!)
│   ├── package.json                   # Dependencies & scripts
│   ├── next.config.js                 # Next.js configuration
│   ├── tsconfig.json                  # TypeScript configuration
│   └── .gitignore                     # Git ignore rules
│
├── 📁 Frontend (EXISTING - HTML/CSS/JS)
│   ├── index.html                     # Home page
│   ├── products.html                  # Products listing
│   ├── product-detail.html            # Single product page
│   ├── cart.html                      # Shopping cart
│   ├── wishlist.html                  # Wishlist page
│   ├── checkout.html                  # Checkout page
│   ├── account.html                   # User account
│   ├── login.html                     # Login page
│   ├── signup.html                    # Registration page
│   ├── categories.html                # Categories page
│   ├── delivery.html                  # Delivery info
│   ├── track-order.html               # Order tracking
│   ├── seller-zone.html               # Seller dashboard
│   │
│   ├── 📁 css/
│   │   ├── main.css                   # Main styles
│   │   ├── header.css                 # Header styles
│   │   ├── footer.css                 # Footer styles
│   │   ├── home.css                   # Home page styles
│   │   ├── products.css               # Products styles
│   │   └── pages.css                  # Other pages styles
│   │
│   ├── 📁 js/
│   │   ├── main.js                    # Main JavaScript
│   │   ├── auth.js                    # Authentication logic
│   │   ├── cart.js                    # Cart functionality
│   │   ├── wishlist.js                # Wishlist functionality
│   │   ├── products-data.js           # Product data
│   │   ├── slider.js                  # Slider functionality
│   │   └── ui.js                      # UI components
│   │
│   └── 📁 assets/
│       ├── 📁 icons/                  # Icon files
│       ├── 📁 images/                 # Image files
│       └── favicon.svg                # Site favicon
│
└── 📄 Documentation
    ├── README_BACKEND.md              # Complete backend guide
    ├── BACKEND_SETUP.md               # Setup instructions
    ├── QUICKSTART.md                  # Quick start guide
    └── PROJECT_STRUCTURE.md           # This file
```

---

## 🔄 How Frontend & Backend Connect

```
┌─────────────────────────────────────────────────────────────┐
│                    USER'S BROWSER                            │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │         EXISTING HTML PAGES (Frontend)             │    │
│  │  (index.html, products.html, cart.html, etc.)      │    │
│  └────────────────────────────────────────────────────┘    │
│                          ↓                                   │
│                   JavaScript Fetch                           │
│                          ↓                                   │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│              NEXT.JS API SERVER (Backend)                    │
│                   localhost:3000/api                         │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │              API ROUTES                             │    │
│  │  /api/products  /api/cart  /api/orders  etc.       │    │
│  └────────────────────────────────────────────────────┘    │
│                          ↓                                   │
│                   Business Logic                             │
│                          ↓                                   │
│  ┌────────────────────────────────────────────────────┐    │
│  │           AUTHENTICATION (NextAuth)                 │    │
│  │        Google OAuth + JWT Sessions                  │    │
│  └────────────────────────────────────────────────────┘    │
│                          ↓                                   │
│                   Database Queries                           │
│                          ↓                                   │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                  MONGODB DATABASE                            │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                 │
│  │  Users   │  │ Products │  │  Orders  │                 │
│  └──────────┘  └──────────┘  └──────────┘                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔑 Key Integration Points

### 1. Authentication Flow
```
User clicks "Login with Google"
    ↓
Redirects to Google
    ↓
User authorizes
    ↓
Back to /api/auth/callback/google
    ↓
NextAuth creates session
    ↓
JWT token stored in cookie
    ↓
Frontend can access user session
```

### 2. Product Listing Flow
```
User visits products.html
    ↓
JavaScript fetches /api/products
    ↓
API queries MongoDB
    ↓
Returns JSON product data
    ↓
JavaScript renders products on page
```

### 3. Add to Cart Flow
```
User clicks "Add to Cart"
    ↓
JavaScript sends POST /api/cart
    ↓
API verifies authentication
    ↓
Adds product to user's cart in DB
    ↓
Returns updated cart
    ↓
Frontend updates cart UI
```

### 4. Checkout Flow
```
User proceeds to checkout
    ↓
JavaScript sends POST /api/orders
    ↓
API creates order in MongoDB
    ↓
Clears user's cart
    ↓
Returns order confirmation
    ↓
Frontend shows success message
```

---

## 📊 Data Flow Diagram

```
┌─────────┐      ┌──────────┐      ┌─────────┐      ┌──────────┐
│  User   │ ←──→ │ Frontend │ ←──→ │  API    │ ←──→ │ MongoDB  │
│ Browser │      │  (HTML)  │      │ Routes  │      │ Database │
└─────────┘      └──────────┘      └─────────┘      └──────────┘
                      ↓                  ↓                  ↓
                 Display UI         Process Logic      Store Data
                 Handle Events      Validate Input     Query Data
                 Fetch API          Auth Check         Update Records
                 Update DOM         Return JSON        Index/Search
```

---

## 🎯 Migration Strategy

### Phase 1: Backend Setup ✅ (COMPLETE)
- [x] Next.js server created
- [x] MongoDB connected
- [x] API routes built
- [x] Authentication configured

### Phase 2: Integration (NEXT)
- [ ] Connect existing HTML pages to API
- [ ] Replace static data with API calls
- [ ] Add Google login button
- [ ] Implement dynamic cart/wishlist

### Phase 3: Enhancement
- [ ] Add payment processing
- [ ] Implement email notifications
- [ ] Create admin dashboard
- [ ] Add product image upload

### Phase 4: Deployment
- [ ] Deploy backend to cloud
- [ ] Set up production database
- [ ] Configure domain & SSL
- [ ] Performance optimization

---

## 💻 Development Workflow

```bash
# Terminal 1: Run Next.js API server
npm run dev
# Server runs at http://localhost:3000

# Terminal 2: (Optional) Seed database
npm run seed

# Open browser
# Test API: http://localhost:3000/api-test.html
# Your site: file:///path/to/index.html
```

---

## 🔗 URL Mapping

| Old (Static) | New (API) | Purpose |
|--------------|-----------|---------|
| products-data.js | /api/products | Get products |
| localStorage cart | /api/cart | Persistent cart |
| localStorage wishlist | /api/wishlist | Persistent wishlist |
| Manual login | /api/auth/signin | Google OAuth |
| Static orders | /api/orders | Real order tracking |

---

## 🚀 Quick Reference

**API Base URL:** `http://localhost:3000/api`

**Test Page:** `http://localhost:3000/api-test.html`

**Start Server:** `npm run dev`

**Seed Database:** `npm run seed`

**Docs:** See `README_BACKEND.md` for full API documentation
