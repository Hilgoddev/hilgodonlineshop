# Hilgod Online Store

A multi-vendor e-commerce platform built for the Nigerian market. Customers can browse, cart, and pay; sellers manage their own storefronts and products; admins oversee the entire platform.

**Live**
- Store — https://hilgod-frontend.onrender.com
- API — https://hilgodonlineshop.onrender.com

---

## Platform Features

### For Customers
- Browse, search, and filter thousands of products by category
- Persistent shopping cart and wishlist (survives browser close and device switch)
- Paystack card payment, Stripe card payment, bank transfer, and pay-on-delivery checkout
- Order history and real-time order tracking with a step-by-step timeline
- Product reviews and star ratings
- Google Sign-In support

### For Sellers
- Apply to become a seller; admin reviews and approves the application
- Seller dashboard: product management, sales metrics, revenue analytics
- Upload product photos directly from your device (or paste an image URL)
- View all customer orders containing your products

### For Admins
- Platform dashboard with live revenue, order, and user metrics
- Approve or reject products, sellers, and stores
- User management with one-click role switching (Admin / Seller / Customer)
- Category management
- Platform analytics: revenue, low-stock alerts, review stats, pending approvals

---

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React 19 |
| Backend | Express.js 5, Node.js 18+ |
| Database | Supabase (PostgreSQL + Row Level Security) |
| Auth | Supabase Auth (email/password + Google OAuth) |
| Storage | Supabase Storage (product images) |
| Payments | Paystack, Stripe, Bank Transfer |
| Email | Resend |
| Hosting | Render (two Node.js Web Services) |

---

## Deployment

Both services deploy automatically from the `main` branch on Render.

| Service | Root Dir | Build | Start |
|---|---|---|---|
| Backend | `backend` | `npm install` | `node src/index.js` |
| Frontend | `frontend` | `npm install --include=dev && npm run build` | `npm run start` |

### Backend Environment Variables

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
PAYSTACK_SECRET_KEY=sk_live_your-key
STRIPE_SECRET_KEY=sk_live_your-stripe-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret
BANK_NAME=Your Bank Name
BANK_ACCOUNT_NAME=Your Business Name
BANK_ACCOUNT_NUMBER=0000000000
BANK_SORT_CODE=000
RESEND_API_KEY=your-resend-api-key
ADMIN_EMAIL=your-admin@email.com
FRONTEND_URL=https://your-frontend.onrender.com
NODE_ENV=production
EMAIL_VERIFICATION_ENABLED=true
```

### Frontend Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_URL=https://your-backend.onrender.com/api
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your-stripe-key
GOOGLE_CLIENT_ID=your-google-client-id
```

---

## Initial Setup

### 1. Database (Supabase)

1. Create an account at https://supabase.com and start a new project.
2. Open **SQL Editor** and run the full `backend/supabase/schema.sql` file to create all tables, policies, and triggers.
3. Collect your credentials from **Project Settings → API**.

### 2. Payments (Paystack)

1. Register at https://paystack.com and complete business verification.
2. Copy your live secret key and set it as `PAYSTACK_SECRET_KEY` on Render.
3. In your Paystack dashboard go to **Settings → Webhooks** and add:
   ```
   https://your-backend.onrender.com/api/payment/webhook
   ```
   Enable the `charge.success` event.

### 2b. Payments (Stripe)

1. Register at https://stripe.com and activate your account.
2. From **Developers → API Keys**, copy your **Live Secret Key** (`sk_live_...`) and **Live Publishable Key** (`pk_live_...`).
3. Set `STRIPE_SECRET_KEY` on your backend Render service and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` on your frontend Render service.
4. Go to **Developers → Webhooks → Add endpoint** and enter:
   ```
   https://your-backend.onrender.com/api/stripe/webhook
   ```
   Enable the `payment_intent.succeeded` event. Copy the **Signing Secret** (`whsec_...`) and set it as `STRIPE_WEBHOOK_SECRET` on Render.

### 2c. Bank Transfer

Set your business bank account details as environment variables on the backend Render service:
```
BANK_NAME=Your Bank Name
BANK_ACCOUNT_NAME=Your Business Name
BANK_ACCOUNT_NUMBER=Your Account Number
BANK_SORT_CODE=Your Sort Code
```
Customers will be shown these details at checkout and instructed to include their order reference in the payment narration.

### 3. Email (Resend)

1. Create an account at https://resend.com (free up to 3,000 emails/month).
2. Set `RESEND_API_KEY` and `ADMIN_EMAIL` on Render.

### 4. Google Sign-In (Optional)

1. Create a project in Google Cloud Console and enable the Google+ API.
2. Create an OAuth 2.0 Client ID (Web Application).
3. Add your Supabase callback URI as an authorized redirect:
   ```
   https://your-supabase-project.supabase.co/auth/v1/callback
   ```
4. Set `GOOGLE_CLIENT_ID` on Render (both services).

### 5. First Admin Account

1. Sign up on the platform to create your account.
2. Open **Supabase Dashboard → Table Editor → profiles**.
3. Find your row and change the `role` column from `customer` to `admin`.
4. Refresh the platform — full admin access is now active.

---

## User Roles

| Role | Access |
|---|---|
| Customer | Browse, cart, wishlist, orders, reviews, order tracking |
| Seller | All customer features + seller dashboard, product uploads, analytics, customer orders |
| Admin | All seller features + platform dashboard, user management, product/store/seller approvals, analytics |

---

## Local Development

```bash
# Backend (http://localhost:5000)
cd backend
npm install
npm run dev

# Frontend (http://localhost:3000)
cd frontend
npm install
npm run dev
```

Create `backend/.env` and `frontend/.env.local` using the variable names above, pointing to `http://localhost:5000` for local API calls.

---

## API Reference (Selected Endpoints)

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/health` | None | Health check |
| `GET` | `/api/products` | None | List / search / filter products |
| `GET` | `/api/products/:id` | None | Single product detail |
| `POST` | `/api/products` | Seller/Admin | Create product |
| `PUT` | `/api/products/:id` | Seller/Admin | Update product |
| `DELETE` | `/api/products/:id` | Seller/Admin | Soft-delete product |
| `POST` | `/api/upload/product-image` | Authenticated | Upload image to Supabase Storage |
| `GET` | `/api/orders` | User | Own order history |
| `POST` | `/api/orders` | User | Place order |
| `PUT` | `/api/orders/:id` | Admin | Update order status |
| `POST` | `/api/payment/initialize` | User | Start Paystack payment |
| `POST` | `/api/payment/webhook` | Paystack | Payment confirmation callback |
| `GET` | `/api/payment/bank-details` | None | Retrieve bank transfer account details |
| `POST` | `/api/stripe/create-payment-intent` | User | Create Stripe PaymentIntent |
| `POST` | `/api/stripe/webhook` | Stripe | Stripe HMAC payment callback |
| `GET` | `/api/seller/dashboard` | Seller | Sales metrics + product list |
| `GET` | `/api/seller/analytics` | Seller | Per-product revenue breakdown |
| `GET` | `/api/seller/orders` | Seller | Customer orders for seller's products |
| `GET` | `/api/admin/stats` | Admin | Platform-wide metrics |
| `POST` | `/api/newsletter/subscribe` | None | Newsletter sign-up |
| `POST` | `/api/delivery/apply` | None | Delivery partner application |
