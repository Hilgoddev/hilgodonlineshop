# Hilgod Online Shop — Full Project Progress Report

**Prepared by:** Development Team  
**Report Date:** 2026-05-07  
**Stack:** Next.js 16 · React 19 · Express.js 5 · Supabase (PostgreSQL + Auth) · Paystack  
**Hosting:** Render (two live Web Services — auto-deploy on push to `main`)  
**Repository:** https://github.com/Walter-sdq/HilgodOnlineShop

---

## Live URLs

| Service | URL | Status |
|---|---|---|
| **Customer Frontend** | https://hilgod-frontend.onrender.com | Live |
| **Backend API** | https://hilgodonlineshop.onrender.com | Live |
| **API Health Check** | https://hilgodonlineshop.onrender.com/api/health | Healthy |

---

## Overall Completion: **~80%**

Core infrastructure is fully live and deployable. The remaining 20% consists of email notifications, file-based image upload, three security fixes that must be done before public launch, and the client's own third-party account provisioning.

---

## Part 1 — What Has Been Done

### 1.1 Critical Bug Fixes

These three bugs were present from before this session. Without them, the platform could not function at all.

| Bug | Symptom | Fix Applied |
|---|---|---|
| **Backend crash on startup** | Server refused to start; Express 5 threw `TypeError: Route.post() requires a callback` | Added missing `paymentInitLimiter` export to `backend/src/middleware/rateLimit.js` |
| **All API calls silently returned `undefined`** | Every button click and page load silently failed with no visible error | Removed broken `lodash.debounce` wrapper from `frontend/lib/apiClient.js` — lodash was not installed and debounce wraps return `undefined`, not a Promise |
| **`paystack-api` package not declared** | Backend crashed when payment routes loaded in production | Added `"paystack-api": "^2.0.2"` to `backend/package.json` |

---

### 1.2 Hosting Fixed (Render)

The platform was deployed incorrectly across multiple dimensions.

| Issue | Before | After |
|---|---|---|
| **Frontend service type** | Static Site — Next.js with SSR cannot run as a static site | Rebuilt as Node.js Web Service |
| **Backend start command** | `npm run dev` (node --watch — development mode) | `node src/index.js` (production) |
| **Frontend build command** | `npm install && npm run build` — skipped devDependencies in production | `npm install --include=dev && npm run build` |
| **`NEXT_PUBLIC_API_URL`** | `http://localhost:5000/api` — all API calls went to a server that doesn't exist on Render | `https://hilgodonlineshop.onrender.com/api` |
| **`FRONTEND_URL` on backend** | Old broken static site URL | `https://hilgod-frontend.onrender.com` |
| **Supabase anon key on Render** | One-character typo (`mmrq...` instead of `nmrq...`) — every Supabase call returned HTTP 401 | Corrected to the real anon key |
| **Old broken static site** | `HilgodOnlineShopfront` was still running, causing confusion | Deleted from Render |

---

### 1.3 Authentication Fixed

| Issue | Fix |
|---|---|
| Signup redirected immediately to login before email was confirmed — login returned HTTP 400 | Signup now detects whether a session was returned; if not, shows an email verification modal instead of redirecting |
| Email verification blocking all test signups | Added `POST /api/auth/auto-confirm` endpoint controlled by `EMAIL_VERIFICATION_ENABLED` env flag; when `false`, users are confirmed and signed in immediately after signup |
| `hilgoddev@gmail.com` account locked out (email unconfirmed) | Confirmed via Supabase Admin API |
| Google "G" logo blocked by OpaqueResponseBlocking | Replaced Wikipedia CDN reference with locally-served `/google-logo.svg` |
| Favicon returning 404 | Created `favicon.svg` and `_document.js` to inject it into `<head>` |
| Stale Vite service worker spamming 404 requests | Created `public/dev-sw.js` self-destructing service worker to clear the stale SW |

---

### 1.4 Database

| Action | Detail |
|---|---|
| Schema verified complete | All 11 required tables present and accessible |
| 8 categories seeded | Electronics, Fashion, Home & Living, Beauty & Health, Sports & Fitness, Books & Stationery, Food & Groceries, Phones & Tablets |
| Supabase MCP configured | `.mcp.json` added to project root for future DB access from Claude Code |
| Next.js image domains updated | Added `**.supabase.co`, `images.unsplash.com`, `upload.wikimedia.org` to `next.config.js` allowed hostnames |

---

## Part 2 — What Is Working Right Now (Live)

### Authentication
- Email/password signup — creates account and immediately signs user in (email verification bypassed)
- Email/password login — confirmed working
- Google OAuth — configured and functional (requires redirect URI updated in Google Console for production domain)
- JWT token issued by Supabase, verified on every protected backend route
- Automatic profile creation on first login via Supabase trigger
- Role-based login redirect: `admin` → `/admin`, `seller` → `/seller/dashboard`, `customer` → `/account`

### Product Catalog
- Browse all approved products with search, category filter, and pagination
- Single product detail page
- Admin approve/reject products — only `status=approved` and `is_active=true` products appear publicly
- Sellers can create, edit, and soft-delete their own products

### Shopping Cart
- Persistent server-side cart (survives browser close and device switch)
- Add, update quantity, remove individual items, clear cart
- Cart linked to authenticated user session

### Wishlist
- Add/remove products to wishlist
- Persisted server-side per user

### Order Placement
- Server-side price validation — client-submitted prices checked against database; tampering rejected with `400 Price mismatch detected`
- Stock validation at order time — insufficient stock rejected with `409 Conflict`
- Aggregated duplicate item lines
- Order auto-marked `processing` for pay-on-delivery, `pending` for Paystack

### Payment — Paystack
- Payment initialization route computes amount server-side from the order record — client-submitted amount used only as a tamper signal
- Webhook endpoint at `POST /api/payment/webhook`
- HMAC-SHA512 signature verification with timing-safe comparison
- Idempotent event processing via unique `event_key` in `payment_events` table — duplicate webhooks safely ignored
- `charge.success` event automatically marks order `paid` and clears the user's cart
- **Payment is code-complete but non-functional — Paystack secret key is a placeholder (see Part 4)**

### Admin Dashboard (`/admin`)
- Live platform stats: total products, orders, customers, revenue, pending approval count
- Low stock alerts (products with fewer than 10 units)
- Recent orders list with user attribution
- Customer list with order count and total spend per user
- Product management with approve/reject/status controls
- Order management with full status lifecycle: `pending → processing → shipped → delivered → cancelled`
- Seller application review (approve/reject with admin notes)
- Store approval workflow
- Category management (create, edit, delete)
- Role management (promote/demote users)

### Seller Flow
- Seller application submission form at `/seller-zone`
- Application status tracking (pending/approved/rejected)
- Seller dashboard with metrics: product count, total sales revenue, total units sold
- Store creation and profile management
- Product listing and management per seller

### Infrastructure
- Both Render services live and auto-deploying on every push to `main`
- Rate limiting: general (100 req/15 min), admin (50 req/15 min), payment init (10 req/hour)
- Helmet security headers on all responses
- CORS locked to `FRONTEND_URL` environment variable
- Morgan request logging in production

---

## Part 3 — What Is NOT Working / Incomplete

### 3.1 Not Implemented (Stubs or Placeholder Only)

| Feature | Current State | Impact |
|---|---|---|
| **Email notifications** | Only `console.log` stubs in code — no emails sent for order status changes, seller approvals, or product approvals | Sellers and customers receive no communication after actions |
| **Image upload** | Products, stores, and avatars store URL strings only — there is no file upload UI or storage integration | Sellers cannot upload product photos; they must provide external image URLs manually |
| **Shipping/delivery calculation** | Page exists at `/delivery` — no calculation logic, no carrier integration | Customers see no shipping cost estimate; orders cannot account for delivery fees |
| **Multi-currency** | `CurrencyContext` exists and currency selector is present — all prices are served in NGN only | International customers see NGN amounts regardless of selection |

### 3.2 Partially Implemented

| Feature | What Works | What's Missing |
|---|---|---|
| **Track Order page** | Frontend page at `/track-order` renders | Not wired to authenticated backend — cannot actually fetch order data |
| **Seller Products page** | Page at `/seller/products` renders | Missing some UI interactions; create/edit product flow needs full testing |
| **Product Reviews** | Reviews can be submitted and displayed | No authentication guard — any anonymous user can post reviews under any name/email |
| **Password Reset** | Supabase sends reset email via its default template | No custom reset UI — user is taken to Supabase's generic page |

### 3.3 Security Issues (Must Fix Before Public Launch)

| Issue | File | Risk | Fix Required |
|---|---|---|---|
| **Unauthenticated order lookup** | `backend/src/routes/orders.js` line 254 | `GET /api/orders/:id` has no `verifyToken` middleware — any person who knows or guesses an order UUID can read full order details including shipping address | Add `verifyToken` middleware and ownership check |
| **Reviews have no auth guard** | `backend/src/routes/reviews.js` line 24 | `POST /api/reviews` accepts any name and email — anyone can impersonate any user in reviews | Add `verifyToken`; bind review to `req.user.id` |
| **Profiles RLS too permissive** | `backend/supabase/schema.sql` line 133 | `"Public profiles are viewable by everyone"` — all user PII (full name, phone, address, role) is readable by anyone who sends a request with the anon key | Replace with a policy that exposes only non-sensitive fields publicly; restrict PII to the account owner |
| **Seller dashboard loads all platform order_items** | `backend/src/routes/seller.js` line 88–90 | Fetches up to 5,000 `order_items` from the entire platform into Node.js memory, then filters by seller — leaks revenue data of other sellers during the filter window | Push the `seller_id` filter to the database query level |

---

## Part 4 — Missing API Keys & Credentials

### 4.1 Blocking (Platform Cannot Function Without These)

| Key | Service | Current Status | What Breaks Without It |
|---|---|---|---|
| `PAYSTACK_SECRET_KEY` | Paystack | **Placeholder: `your-paystack-secret-key`** | Payment initialization returns 500 error; no payments can be accepted |

### 4.2 Required for Full Feature Set

| Key / Setting | Service | Status | Where to Get It |
|---|---|---|---|
| **Supabase Auth Site URL** | Supabase Dashboard | Not updated — still points to `localhost` | Supabase Dashboard → Authentication → URL Configuration → set Site URL to `https://hilgod-frontend.onrender.com` |
| **Supabase Auth Redirect URL** | Supabase Dashboard | Not added | Same screen — add `https://hilgod-frontend.onrender.com/auth/login` to Redirect URLs |
| **Google OAuth redirect URI** | Google Cloud Console | Not updated for production | Google Cloud Console → OAuth Client → Authorized redirect URIs → add `https://nmrqdzikceakkhfhflja.supabase.co/auth/v1/callback` |
| **Paystack Webhook URL** | Paystack Dashboard | Not configured | Paystack Dashboard → Settings → Webhooks → add `https://hilgodonlineshop.onrender.com/api/payment/webhook` with event `charge.success` |

### 4.3 Needed When Adding Future Features

| Feature | Service | Key(s) Needed | Cost |
|---|---|---|---|
| Email notifications | Resend (recommended) | `RESEND_API_KEY` | Free up to 3,000 emails/month |
| File-based image upload | Supabase Storage (already provisioned) | Uses existing `SUPABASE_SERVICE_ROLE_KEY` | Included in Supabase plan |
| Alternative image CDN | Cloudinary | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Free tier: 25GB storage |

### 4.4 Currently Active (Developer's Accounts — Must Be Rotated at Handover)

| Key | Service | Location |
|---|---|---|
| `SUPABASE_URL` | Supabase (developer's project) | Backend Render env + `backend/.env` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase | Backend Render env + `backend/.env` |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase | Frontend Render env + `frontend/.env.local` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase | Frontend Render env + `frontend/.env.local` |
| `GOOGLE_CLIENT_ID` | Google Cloud (developer's project) | Both services Render env |
| `GOOGLE_CLIENT_SECRET` | Google Cloud | Backend Render env |

---

## Part 5 — Required Client Actions Before Handover

These are actions only the client can perform — they require creating their own accounts.

### Step 1 — Supabase (Database + Auth)

The platform currently runs on the developer's personal Supabase project. The client must set up their own.

- [ ] Create account at https://supabase.com
- [ ] Create new project (recommended region: `eu-west-2` for Nigeria proximity)
- [ ] Open SQL Editor and run the full `backend/supabase/schema.sql` file once
- [ ] Collect from **Project Settings → API**:
  - `SUPABASE_URL` → Project URL
  - `SUPABASE_SERVICE_ROLE_KEY` → service_role key (never expose publicly)
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → anon/public key
- [ ] Go to **Authentication → URL Configuration**:
  - Set **Site URL** to `https://hilgod-frontend.onrender.com`
  - Add **Redirect URL**: `https://hilgod-frontend.onrender.com/auth/login`
- [ ] Update all Supabase env vars on Render backend and frontend, then redeploy both services

### Step 2 — Paystack (Payments)

- [ ] Register at https://paystack.com (free for Nigerian businesses)
- [ ] Complete KYC/business verification to unlock live NGN transactions
- [ ] Collect live secret key from **Settings → API Keys → Live Secret Key** (`sk_live_...`)
- [ ] Replace `PAYSTACK_SECRET_KEY` on Render backend — remove placeholder `your-paystack-secret-key`
- [ ] Configure webhook: **Settings → API Keys & Webhooks → Webhooks**
  - URL: `https://hilgodonlineshop.onrender.com/api/payment/webhook`
  - Events: enable `charge.success`

### Step 3 — Google OAuth (Google Login)

- [ ] Go to https://console.cloud.google.com
- [ ] Open the existing OAuth 2.0 Client ID (or create a new Web Application one)
- [ ] Under **Authorized redirect URIs** add: `https://[CLIENT-SUPABASE-PROJECT-REF].supabase.co/auth/v1/callback`
- [ ] In Supabase Dashboard → **Authentication → Providers → Google**: enter Client ID and Secret
- [ ] Update `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` on Render backend

### Step 4 — First Admin Account

- [ ] Sign up on the live platform
- [ ] In Supabase Dashboard → **Table Editor → profiles** → find your row → set `role` to `admin`
- [ ] Return to the platform — `/admin` is now accessible

### Step 5 — Re-enable Email Verification (After SMTP is Set Up)

- [ ] Set up email provider in Supabase → **Authentication → SMTP Settings** (or use Resend integration)
- [ ] Change `EMAIL_VERIFICATION_ENABLED` from `false` → `true` on Render backend → manual redeploy

---

## Part 6 — Remaining Development Work

### High Priority (Required Before Public Launch)

| Task | File(s) | Estimated Effort |
|---|---|---|
| Fix unauthenticated `GET /api/orders/:id` — add `verifyToken` + ownership check | `backend/src/routes/orders.js:254` | 1 hour |
| Fix profiles RLS — restrict PII to account owner | Supabase Dashboard or schema migration | 1 hour |
| Fix reviews — add `verifyToken`, bind to authenticated user | `backend/src/routes/reviews.js:24` | 2 hours |
| Fix seller dashboard — push `seller_id` filter to DB | `backend/src/routes/seller.js:88` | 1 hour |
| Email notifications — integrate Resend (order paid, seller approved, product approved) | New `backend/src/services/email.js` + update routes | 1–2 days |

### Medium Priority (Ship With First Update)

| Task | File(s) | Estimated Effort |
|---|---|---|
| Image upload — integrate Supabase Storage for products, stores, avatars | New upload endpoint + frontend file picker | 1–2 days |
| Wire Track Order page to authenticated backend | `frontend/pages/track-order.js` + `backend/src/routes/orders.js` | 3 hours |
| Complete and fully test seller products UI (create/edit flow) | `frontend/pages/seller/products.js` | 4 hours |
| Password reset — custom UI page | `frontend/pages/auth/forgot-password.js` | 1 day |

### Low Priority (Post-Launch Roadmap)

| Task | Estimated Effort |
|---|---|
| Multi-currency support — convert NGN prices using exchange rate API | 3–5 days |
| Shipping / delivery rate calculation — integrate carrier API or flat-rate config | 3–5 days |
| Seller analytics — charts, monthly revenue trends, top products | 2–3 days |
| Customer order tracking timeline UI | 2 days |
| Product review system refactor — attach to `auth.uid()`, show verified purchase badge | 1 day |

**Estimated total effort to fully production-ready (high + medium priority only): 5–8 working days**

---

## Part 7 — Current Database State

| Table | Rows | Notes |
|---|---|---|
| `profiles` | 3 | admin × 1, seller × 1, customer × 1 |
| `categories` | 8 | Seeded: Electronics, Fashion, Home & Living, Beauty & Health, Sports & Fitness, Books & Stationery, Food & Groceries, Phones & Tablets |
| `stores` | 0 | No seller stores created yet |
| `products` | 0 | No products listed yet |
| `orders` | 0 | No customer orders placed |
| `order_items` | 0 | — |
| `cart_items` | 0 | — |
| `wishlist_items` | 0 | — |
| `seller_applications` | 1 | One pending application |
| `payment_events` | 0 | — |
| `reviews` | 0 | — |
| **auth.users** | **5** | All confirmed — linuxrate@gmail.com, hilgoddev@gmail.com, sediqsadia3@gmail.com, akhigbewahab354@gmail.com, akhigbeabdulwahab354@gmail.com |

---

## Part 8 — Module Completion Breakdown

| Module | Status | Completion |
|---|---|---|
| Hosting & Deployment (Render, CI/CD, env vars) | Fully live, auto-deploys on push | **95%** |
| Authentication (signup, login, JWT, role-based redirect) | Fully working on live | **95%** |
| Shopping Cart (add, update, remove, persist) | Working | **95%** |
| Product Catalog (listing, search, filter, detail) | Working | **90%** |
| Wishlist | Working | **90%** |
| Order Placement (server-side price + stock validation) | Working | **90%** |
| Admin Dashboard (stats, orders, customers, products) | Working | **88%** |
| Seller Application Flow (apply, approve, reject) | Working | **85%** |
| Categories (CRUD, admin-managed, seeded) | Working | **85%** |
| Store Management (create, update, approval workflow) | Working | **80%** |
| Payment — Paystack (code complete, key missing) | Code ready, key placeholder | **70%** |
| Seller Dashboard (metrics, product management) | Working, efficiency issue in query | **72%** |
| Product Reviews | No auth guard, partially broken | **50%** |
| Password Reset Flow | Supabase default email only | **50%** |
| Track Order Page | Frontend only, backend not wired | **40%** |
| Multi-currency Support | Context exists, NGN-only in practice | **35%** |
| Email Notifications | `console.log` stubs only | **10%** |
| Image Upload | URL strings only, no file upload | **15%** |
| Delivery / Shipping Calculation | Static page only, no logic | **10%** |

### **Overall: ~80% Complete**

---

## Part 9 — Architecture Overview

```
BROWSER (Customer / Seller / Admin)
  Next.js 16 (React 19) — https://hilgod-frontend.onrender.com
  All /api/* requests proxied server-side via next.config.js rewrites
         |
         | Server-to-server HTTPS (no browser CORS)
         v
RENDER — EXPRESS.JS 5 BACKEND
  URL: https://hilgodonlineshop.onrender.com
  Routes: /api/auth · /api/products · /api/orders · /api/payment
          /api/cart · /api/wishlist · /api/categories · /api/stores
          /api/reviews · /api/seller · /api/admin · /api/user
  Security: Helmet · CORS · Morgan · express-rate-limit
  Auth: Supabase JWT verification on every protected route
         |
         | supabase-js client (service_role key — bypasses RLS)
         v
SUPABASE POSTGRESQL — project: nmrqdzikceakkhfhflja
  11 tables · RLS enabled on all · Triggers: auto-create profile on signup
  Auth module: email/password + Google OAuth
         ^
         | HMAC-SHA512 signed webhook (POST /api/payment/webhook)
PAYSTACK
  Nigerian NGN payment gateway
  Idempotent processing via payment_events table
```

---

## Part 10 — Environment Variables Reference

### Backend (`HilgodOnlineShop` on Render)

| Variable | Value / Status | Notes |
|---|---|---|
| `SUPABASE_URL` | Set ✓ | Developer's project — must be replaced at handover |
| `SUPABASE_SERVICE_ROLE_KEY` | Set ✓ | Developer's project — keep secret, never expose to frontend |
| `PAYSTACK_SECRET_KEY` | **PLACEHOLDER ✗** | Replace with `sk_live_...` from Paystack dashboard |
| `GOOGLE_CLIENT_ID` | Set ✓ | Developer's Google project |
| `GOOGLE_CLIENT_SECRET` | Set ✓ | Developer's Google project |
| `FRONTEND_URL` | Set ✓ (`https://hilgod-frontend.onrender.com`) | Used for CORS origin |
| `NODE_ENV` | Set ✓ (`production`) | — |
| `PORT` | Set ✓ (`5000`) | Render overrides this automatically |
| `EMAIL_VERIFICATION_ENABLED` | Set ✓ (`false`) | Change to `"true"` to require email confirmation |

### Frontend (`hilgod-frontend` on Render)

| Variable | Value / Status | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Set ✓ | Developer's project |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Set ✓ | Corrected (was one-character typo causing 401s) |
| `NEXT_PUBLIC_API_URL` | Set ✓ (`https://hilgodonlineshop.onrender.com/api`) | Backend proxy target |
| `GOOGLE_CLIENT_ID` | Set ✓ | Used for OAuth button |
| `NODE_ENV` | Set ✓ (`production`) | — |

---

*This platform runs on the developer's personal Supabase and Google accounts. All credentials listed above belong to the developer and must be rotated and replaced with the client's own accounts at handover. The developer's Supabase project should remain active until the client confirms their own project is fully working.*
