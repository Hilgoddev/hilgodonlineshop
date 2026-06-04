# Hilgod Online Store

A multi-vendor e-commerce platform built for the Nigerian market. Customers can browse, cart, and pay; sellers manage their own storefronts and products; admins oversee the entire platform.

**Live**
- Store — https://www.hilgod.com
- API — https://hilgod-api-two.vercel.app (custom domain `api.hilgod.com` in progress)

> 📚 See [`Docs/SYSTEM-FLOWS.md`](Docs/SYSTEM-FLOWS.md) for a full end-to-end explanation of
> every flow (auth, checkout, all payment paths, fulfilment, payouts, etc.) and
> [`AUDIT.md`](AUDIT.md) for the latest security/correctness audit.

---

## Platform Features

### For Customers
- Browse, search, and filter thousands of products by category
- Persistent shopping cart and wishlist (survives browser close and device switch)
- Paystack card payment, Stripe card payment, bank transfer, and pay-on-delivery checkout
- Order history with live status updates (expandable order details in your account)
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
| Payments | Paystack (primary, NGN), Stripe, Bank Transfer, Pay on Delivery |
| Email | Resend |
| Hosting | Vercel (two projects: `hilgod` frontend + `hilgod-api` backend serverless) |

---

## Deployment

Deployed to **Vercel** via the `deploy.ps1` script (the script renames `.git` during the
deploy to bypass the Hobby-plan team-member block, then restores it). Source of truth is
pushed to the `client` git remote.

```powershell
.\deploy.ps1               # deploy both frontend + backend
.\deploy.ps1 -FrontendOnly # frontend only
.\deploy.ps1 -BackendOnly  # backend only
```

| Project | Root Dir | Notes |
|---|---|---|
| Backend (`hilgod-api`) | `backend` | Express app exported as a Vercel serverless function (10 s limit) |
| Frontend (`hilgod`) | `frontend` | Next.js |

**Manual ops:** set the Paystack webhook to `https://<api-domain>/api/payment/webhook`
(event `charge.success`); enable Supabase Realtime on `orders` + `order_items`.

### Backend Environment Variables

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key          # public key; required for password-change verification
PAYSTACK_SECRET_KEY=sk_live_your-key
STRIPE_SECRET_KEY=sk_live_your-stripe-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret
STRIPE_CURRENCY=ngn                       # optional; defaults to the order's currency (NGN)
BANK_NAME=Your Bank Name
BANK_ACCOUNT_NAME=Your Business Name
BANK_ACCOUNT_NUMBER=0000000000
BANK_SORT_CODE=000
RESEND_API_KEY=your-resend-api-key
ADMIN_EMAIL=your-admin@email.com
SUPPORT_PHONE=+234...                      # shown in email footers
FRONTEND_URL=https://www.hilgod.com
NODE_ENV=production
EMAIL_VERIFICATION_ENABLED=true
```

> All env values are run through `cleanEnv()` to strip BOM/zero-width characters that
> otherwise break HTTP headers (a real bug that previously silenced emails & payments).

### Frontend Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_URL=https://api.hilgod.com/api      # or the .vercel.app API URL
BACKEND_URL=https://api.hilgod.com/api              # used for SSR data fetches
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your-stripe-key
NEXT_PUBLIC_STRIPE_ENABLED=true
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
2. Copy your live secret key and set it as `PAYSTACK_SECRET_KEY` on Vercel.
3. In your Paystack dashboard go to **Settings → Webhooks** and add:
   ```
   https://api.hilgod.com/api/payment/webhook
   ```
   Enable the `charge.success` event.

### 2b. Payments (Stripe)

1. Register at https://stripe.com and activate your account.
2. From **Developers → API Keys**, copy your **Live Secret Key** (`sk_live_...`) and **Live Publishable Key** (`pk_live_...`).
3. Set `STRIPE_SECRET_KEY` on your backend Vercel project and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` on your frontend Vercel project.
4. Go to **Developers → Webhooks → Add endpoint** and enter:
   ```
   https://api.hilgod.com/api/stripe/webhook
   ```
   Enable the `payment_intent.succeeded` event. Copy the **Signing Secret** (`whsec_...`) and set it as `STRIPE_WEBHOOK_SECRET` on Vercel.

### 2c. Bank Transfer

Set your business bank account details as environment variables on the backend Vercel project:
```
BANK_NAME=Your Bank Name
BANK_ACCOUNT_NAME=Your Business Name
BANK_ACCOUNT_NUMBER=Your Account Number
BANK_SORT_CODE=Your Sort Code
```
Customers will be shown these details at checkout and instructed to include their order reference in the payment narration.

### 3. Email (Resend)

1. Create an account at https://resend.com (free up to 3,000 emails/month).
2. Set `RESEND_API_KEY` and `ADMIN_EMAIL` on Vercel.

### 4. Google Sign-In (Optional)

1. Create a project in Google Cloud Console and enable the Google+ API.
2. Create an OAuth 2.0 Client ID (Web Application).
3. Add your Supabase callback URI as an authorized redirect:
   ```
   https://your-supabase-project.supabase.co/auth/v1/callback
   ```
4. Set `GOOGLE_CLIENT_ID` on Vercel (both services).

### 5. First Admin Account

1. Sign up on the platform to create your account.
2. Open **Supabase Dashboard → Table Editor → profiles**.
3. Find your row and change the `role` column from `customer` to `admin`.
4. Refresh the platform — full admin access is now active.

---

## User Roles

| Role | Access |
|---|---|
| Customer | Browse, cart, wishlist, order history, reviews, returns |
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
| `PUT` | `/api/orders/:id` | Admin | Update order status (cascades to items; triggers paid side-effects) |
| `POST` | `/api/orders/:id/notify` | Admin | Send a custom email to the customer |
| `POST` | `/api/payment/initialize` | User | Start Paystack payment (rate-limited) |
| `POST` | `/api/payment/webhook` | Paystack (HMAC) | Payment confirmation callback (idempotent) |
| `GET` | `/api/payment/verify/:reference` | User | Verify Paystack txn on redirect & sync order |
| `GET` | `/api/payment/bank-details` | None | Retrieve bank transfer account details |
| `POST` | `/api/stripe/create-payment-intent` | User | Create Stripe PaymentIntent |
| `POST` | `/api/stripe/webhook` | Stripe (sig) | Stripe payment callback (idempotent) |
| `POST` | `/api/reviews` | User | Create review (1–5, one per product, rate-limited) |
| `POST` | `/api/returns` | User | Request a return (rate-limited) |
| `PUT` | `/api/user/password` | User | Change password (verifies current password) |
| `GET` | `/api/seller/dashboard` | Seller | Sales metrics + product list (paid orders only) |
| `GET` | `/api/seller/analytics` | Seller | Per-product revenue breakdown (paid orders only) |
| `GET` | `/api/seller/orders` | Seller | Customer orders for seller's products |
| `GET` | `/api/seller/earnings` | Seller | Gross/withdrawn/available balance + payouts |
| `POST` | `/api/seller/payouts/request` | Seller | Request a withdrawal |
| `GET` | `/api/admin/stats` | Admin | Platform-wide metrics |
| `GET` | `/api/admin/payouts` | Admin | List payout requests |
| `PUT` | `/api/admin/payouts/:id` | Admin | Approve / mark paid / reject a payout |
| `POST` | `/api/newsletter/subscribe` | None | Newsletter sign-up |
| `POST` | `/api/delivery/apply` | None | Delivery partner application |
