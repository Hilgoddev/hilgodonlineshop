# Hilgod Online Shop — Full Project Progress Report

**Prepared by:** Development Team  
**Report Date:** 2026-05-07 (Updated)  
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

## Overall Completion: **~88%**

All security vulnerabilities fixed. Platform is now fully dynamic (no static fallback data). Test accounts seeded with 40 real products. Remaining work is email notifications, image upload UI, password reset page, and delivery calculation.

---

## Part 1 — What Has Been Done

### 1.1 Critical Bug Fixes (Previous Session)

| Bug | Symptom | Fix Applied |
|---|---|---|
| **Backend crash on startup** | Express 5 threw `TypeError: Route.post() requires a callback` | Added missing `paymentInitLimiter` export to `rateLimit.js` |
| **All API calls silently returned `undefined`** | Every button click and page load silently failed | Removed broken `lodash.debounce` wrapper from `apiClient.js` |
| **`paystack-api` package not declared** | Backend crashed when payment routes loaded in production | Added to `backend/package.json` |

---

### 1.2 Critical Bug Fixes (This Session)

| Bug | Root Cause | Fix Applied |
|---|---|---|
| **Backend 502 — all API calls failing** | `reviews.js` used `verifyToken` middleware without importing it — `ReferenceError` crashed Express on startup | Added `const { verifyToken } = require('./auth')` to `reviews.js` |
| **Add to Cart silently fails** | `cart_items` has a UNIQUE constraint on `(user_id, product_id)` but the upsert had no `onConflict` — every add for an existing item threw a duplicate key error | Added `{ onConflict: 'user_id,product_id' }` to the upsert in `cart.js` |
| **Supabase profiles query returning 500** | `"Admins can view all profiles"` RLS policy did `EXISTS (SELECT 1 FROM profiles WHERE role='admin')` — self-referential subquery caused infinite recursion in PostgreSQL | Dropped the recursive policy via migration; backend uses `service_role` which bypasses RLS |
| **Google sign-in does not populate profile name/avatar** | `handle_new_user` trigger read `full_name` and `avatar_url` from user metadata, but Google OAuth sends `name` and `picture` | Updated trigger to `COALESCE(full_name, name)` and `COALESCE(avatar_url, picture)`; also added `picture` fallback in `sync-profile` endpoint |

---

### 1.3 Security Fixes — All Completed

All four vulnerabilities identified in the original security review have been resolved:

| Vulnerability | File | Fix Applied |
|---|---|---|
| **Unauthenticated order lookup** | `orders.js:254` | Added `verifyToken` + ownership check; admins can view all, users only their own |
| **Reviews with no auth guard** | `reviews.js:24` | Added `verifyToken`; `user_name` and `user_email` now sourced from verified profile, not request body |
| **Profiles RLS too permissive** | Supabase DB | Dropped public read policy; users can only read their own profile row |
| **Seller dashboard loads all platform order_items** | `seller.js:88` | Refactored to first get seller's product IDs, then filter `order_items` at DB level |

---

### 1.4 Platform Made Fully Dynamic

All pages previously fell back to a hardcoded `HILGOD_PRODUCTS` array when the API was unavailable. This has been removed entirely:

| Page | Change |
|---|---|
| `pages/index.js` | Removed `HILGOD_PRODUCTS` import; on API failure returns empty products (no fake data) |
| `pages/products/index.js` | Same — returns empty initial state; client-side `fetchProducts` handles retry |
| `pages/products/[id].js` | Returns `notFound: true` when product ID doesn't match any DB record (proper 404) |
| `pages/track-order.js` | Wired to authenticated backend using `apiFetch`; shows "please log in" prompt for guests |

---

### 1.5 Test Accounts Set Up

| Account | Email | Role | Password |
|---|---|---|---|
| **Admin** | hilgoddev@gmail.com | `admin` | `HilgodAdmin2025!` |
| **Seller** | linuxrate@gmail.com | `seller` (approved) | `HilgodSeller2025!` |

The seller account has:
- Approved seller application (reviewed by the admin account)
- A store: **TechMart NG** (slug: `techmart-ng`)
- **40 products** seeded across all categories (electronics, beauty, womenswear, menswear, shoes, accessories, home, kitchen)

> **Important:** Change these passwords before any public or client demo.

---

### 1.6 Hosting Fixed (Previous Session)

| Issue | Before | After |
|---|---|---|
| Frontend service type | Static Site (SSR cannot run as static) | Node.js Web Service |
| Backend start command | `npm run dev` (development mode) | `node src/index.js` (production) |
| Frontend build command | Skipped devDependencies | `npm install --include=dev && npm run build` |
| `NEXT_PUBLIC_API_URL` | `localhost:5000` | `https://hilgodonlineshop.onrender.com/api` |
| Supabase anon key | One-character typo causing 401 | Corrected |

---

### 1.7 Authentication Fixed (Previous Session)

| Issue | Fix |
|---|---|
| Signup returned 400 before email confirmed | Auto-confirm endpoint controlled by `EMAIL_VERIFICATION_ENABLED` env flag |
| Google login blocked (OpaqueResponseBlocking) | Google logo served locally (`/public/google-logo.svg`) |
| Favicon returning 404 | Created `favicon.svg` and `_document.js` |
| Stale Vite service worker 404s | Self-destructing service worker at `/public/dev-sw.js` |

---

## Part 2 — What Is Working Right Now (Live)

### Authentication
- Email/password signup with auto-confirm (email verification bypassed during dev)
- Email/password login
- Google OAuth (configured; production redirect URI must be added — see Part 4)
- JWT token verified on every protected backend route
- Profile created automatically on signup via DB trigger (now correctly reads Google metadata)
- Role-based redirect: `admin` → `/admin`, `seller` → `/seller/dashboard`, `customer` → `/account`

### Product Catalog
- All 40 seeded products live in the DB and loading dynamically from the API
- Search, category filter, pagination
- Single product detail page with related products
- Admin approve/reject products — only `approved + is_active` products appear publicly

### Shopping Cart
- **Fixed this session** — add to cart now correctly updates quantity for duplicate items
- Persistent server-side cart (survives browser close and device switch)
- Guest cart saved in `localStorage`, merged to server on login

### Wishlist
- Add/remove, persisted server-side per user

### Order Placement
- Server-side price validation (tamper-proof)
- Stock validation
- Pay-on-delivery auto-marked `processing`

### Track Order
- **Now wired** — users can enter their order ID and see full status, items, and progress timeline
- Requires login (shows prompt if not authenticated)

### Payment — Paystack
- Code-complete, HMAC-signed webhook, idempotent processing
- **Non-functional until real secret key is set** (see Part 4)

### Admin Dashboard
- Platform stats, low stock alerts, recent orders
- Customer list, order management (full lifecycle)
- Product approvals, seller application review, store approvals
- Category management, role management

### Seller Dashboard
- Seller metrics (products, total sales, total units)
- Seller's own products listed and manageable
- All data scoped to the authenticated seller — no cross-seller data leaks

---

## Part 3 — What Is NOT Working / Incomplete

### 3.1 Not Implemented (Stubs or Placeholder Only)

| Feature | Current State | Impact |
|---|---|---|
| **Email notifications** | `console.log` stubs only — no emails sent | Users and sellers receive no communication after orders, approvals, or status changes |
| **Image upload** | Products store URL strings only — no file upload UI | Sellers must provide external image URLs manually |
| **Password reset page** | Supabase sends reset email but opens generic Supabase page | Poor UX — no branded or custom reset UI |
| **Delivery / shipping calculation** | Static `/delivery` page — no logic | No shipping cost estimate or carrier integration |
| **Multi-currency** | Context exists but all prices are NGN only | International pricing not functional |

### 3.2 Partially Implemented

| Feature | What Works | What's Missing |
|---|---|---|
| **Seller Products page** | Page renders with seller's own products | Create/edit product flow needs full UI testing |
| **Product Reviews** | Fetch + display works; authenticated submission works | No "verified purchase" badge; no rating aggregation update |

### 3.3 Leaked Password Protection

> **Client Note:** Supabase's HaveIBeenPwned.org integration (which blocks users from setting compromised passwords) is only available on **Supabase Pro Plan** and above. The current project runs on the free tier. The client must upgrade their Supabase project to Pro Plan to enable this feature after handover.

---

## Part 4 — Missing API Keys & Credentials

### 4.1 Blocking (Platform Cannot Function Without These)

| Key | Service | Current Status | What Breaks Without It |
|---|---|---|---|
| `PAYSTACK_SECRET_KEY` | Paystack | **Placeholder: `your-paystack-secret-key`** | Payment initialization returns 500; no payments accepted |

### 4.2 Required for Full Feature Set

| Key / Setting | Service | Status |
|---|---|---|
| **Supabase Auth Site URL** | Supabase Dashboard | Must be set to `https://hilgod-frontend.onrender.com` |
| **Google OAuth redirect URI** | Google Cloud Console | Must add `https://nmrqdzikceakkhfhflja.supabase.co/auth/v1/callback` |
| **Paystack Webhook URL** | Paystack Dashboard | Must add `https://hilgodonlineshop.onrender.com/api/payment/webhook` |

### 4.3 Needed When Adding Future Features

| Feature | Service | Key(s) Needed |
|---|---|---|
| Email notifications | Resend | `RESEND_API_KEY` (free up to 3,000/month) |
| Image upload | Supabase Storage | Uses existing `SUPABASE_SERVICE_ROLE_KEY` |

### 4.4 Currently Active (Developer's Accounts — Rotate at Handover)

| Key | Service | Location |
|---|---|---|
| `SUPABASE_URL` | Supabase (developer's project) | Backend Render env + `backend/.env` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase | Backend Render env + `backend/.env` |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase | Frontend Render env + `frontend/.env.local` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase | Frontend Render env + `frontend/.env.local` |
| `GOOGLE_CLIENT_ID` | Google Cloud | Both services Render env |
| `GOOGLE_CLIENT_SECRET` | Google Cloud | Backend Render env |

---

## Part 5 — Required Client Actions Before Handover

### Step 1 — Supabase
- [ ] Create account at https://supabase.com → new project
- [ ] Run full `backend/supabase/schema.sql` in SQL Editor
- [ ] Collect `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] Set Site URL and Redirect URL in Authentication → URL Configuration
- [ ] Upgrade to **Pro Plan** to enable leaked password protection via HaveIBeenPwned

### Step 2 — Paystack
- [ ] Register + complete KYC at https://paystack.com
- [ ] Collect live secret key → set `PAYSTACK_SECRET_KEY` on Render backend
- [ ] Add webhook URL in Paystack dashboard (see Part 4)

### Step 3 — Google OAuth
- [ ] Add production callback URI in Google Cloud Console
- [ ] Update `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` to client's own credentials

### Step 4 — First Admin Account
- [ ] Sign up on the live platform → set `role = 'admin'` in Supabase Table Editor → profiles

### Step 5 — Enable Email Verification
- [ ] Configure SMTP in Supabase → set `EMAIL_VERIFICATION_ENABLED=true` on Render backend

---

## Part 6 — Remaining Development Work

### High Priority

| Task | File(s) | Estimated Effort |
|---|---|---|
| Email notifications (order placed, paid, shipped, seller approved) | New `backend/src/services/email.js` + update routes | 2–3 days |
| Image upload — Supabase Storage for products, stores, avatars | New upload endpoint + frontend file picker | 2 days |
| Password reset — custom branded page | `frontend/pages/auth/forgot-password.js` | 1 day |

### Medium Priority

| Task | File(s) | Estimated Effort |
|---|---|---|
| Fully test and polish seller create/edit product flow | `frontend/pages/seller/products.js` | 4 hours |
| Delivery / shipping fee calculation | `/delivery` page + backend | 3–5 days |

### Low Priority (Post-Launch)

| Task | Effort |
|---|---|
| Multi-currency (NGN → USD/GBP via exchange rate API) | 3–5 days |
| Seller analytics charts (monthly revenue, top products) | 2–3 days |
| "Verified purchase" badge on reviews | 1 day |

**Estimated total to fully production-ready: 5–8 working days**

---

## Part 7 — Unused Files (Safe to Delete)

These files are remnants of the old static HTML prototype site and are entirely superseded by the Next.js app. They serve no function and add noise to the repo.

### Old Static HTML Site (frontend root)
```
frontend/index.html
frontend/account.html
frontend/categories.html
frontend/checkout.html
frontend/delivery.html
frontend/login.html
frontend/product-detail.html
frontend/products.html
frontend/seller-zone.html
frontend/signup.html
frontend/track-order.html
frontend/cart.html
frontend/wishlist.html
```

### Old Vanilla JS (frontend/js/)
```
frontend/js/auth.js
frontend/js/ui.js
frontend/js/slider.js
frontend/js/products-data.js
frontend/js/wishlist.js
frontend/js/main.js
frontend/js/cart.js
```

### Other Unused Files
```
frontend/update_topbar.js          — old static site utility
frontend/public/api-test.html      — dev test file
frontend/lib/products-data.js      — static fallback data, now fully removed from all pages
```

### Stray Dev Directory
```
frontend/dev/                      — abandoned dev attempt with mongoose, next-auth, bcryptjs,
                                     zod node_modules — entire directory can be deleted
```

> None of these are imported by any Next.js page or component. Deleting them will not break anything.

---

## Part 8 — Current Database State

| Table | Rows | Notes |
|---|---|---|
| `profiles` | 2+ | `hilgoddev@gmail.com` (admin), `linuxrate@gmail.com` (seller) |
| `categories` | 8 | Electronics, Fashion, Home & Living, Beauty & Health, Sports, Books, Food, Phones |
| `stores` | 1 | TechMart NG (approved, owner: linuxrate@gmail.com) |
| `products` | 40 | All approved, active, across all categories — seeded from site's own product data |
| `seller_applications` | 1 | linuxrate@gmail.com → approved |
| `orders` | 0 | No customer orders placed yet |
| `order_items` | 0 | — |
| `cart_items` | 0 | — |
| `wishlist_items` | 0 | — |
| `payment_events` | 0 | — |
| `reviews` | 0 | — |
| **auth.users** | 5+ | All confirmed |

---

## Part 9 — Module Completion Breakdown

| Module | Status | Completion |
|---|---|---|
| Hosting & Deployment | Live, auto-deploys on push | **95%** |
| Authentication (signup, login, JWT, Google OAuth, role redirect) | Fully working | **95%** |
| Shopping Cart (add, update, remove, persist, merge on login) | Fixed & working | **98%** |
| Product Catalog (listing, search, filter, detail, 40 real products) | Fully dynamic, all data from DB | **95%** |
| Wishlist | Working | **90%** |
| Order Placement (server-side price + stock validation) | Working | **90%** |
| Track Order Page | Now wired to authenticated backend | **85%** |
| Admin Dashboard (stats, orders, customers, products, approvals) | Working | **88%** |
| Seller Dashboard (metrics, product management, scoped to seller) | Working, efficient DB queries | **88%** |
| Seller Application Flow | Working end-to-end | **90%** |
| Store Management | Working | **82%** |
| Categories (CRUD, seeded) | Working | **85%** |
| Security (RLS, auth guards, price tamper protection) | All 4 vulnerabilities resolved | **95%** |
| Payment — Paystack | Code complete, key placeholder | **70%** |
| Product Reviews | Auth guard added, display works | **70%** |
| Password Reset | Supabase default only, no custom UI | **50%** |
| Email Notifications | `console.log` stubs only | **10%** |
| Image Upload | URL strings only, no file upload | **15%** |
| Delivery / Shipping Calculation | Static page, no logic | **10%** |
| Multi-currency | Context exists, NGN-only in practice | **35%** |

### **Overall: ~88% Complete**

---

## Part 10 — Architecture Overview

```
BROWSER (Customer / Seller / Admin)
  Next.js 16 (React 19) — https://hilgod-frontend.onrender.com
  All /api/* requests proxied server-side via next.config.js rewrites
  No hardcoded product data — all content fetched from API
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
  11 tables · RLS enabled · Trigger: handle_new_user (reads Google name+picture)
  Auth: email/password + Google OAuth
         ^
         | HMAC-SHA512 signed webhook
PAYSTACK — Nigerian NGN payment gateway
```

---

## Part 11 — Environment Variables Reference

### Backend (`HilgodOnlineShop` on Render)

| Variable | Value / Status | Notes |
|---|---|---|
| `SUPABASE_URL` | Set ✓ | Rotate at handover |
| `SUPABASE_SERVICE_ROLE_KEY` | Set ✓ | Never expose to frontend |
| `PAYSTACK_SECRET_KEY` | **PLACEHOLDER ✗** | Replace with `sk_live_...` |
| `GOOGLE_CLIENT_ID` | Set ✓ | Developer's Google project |
| `GOOGLE_CLIENT_SECRET` | Set ✓ | Developer's Google project |
| `FRONTEND_URL` | Set ✓ (`https://hilgod-frontend.onrender.com`) | CORS origin |
| `NODE_ENV` | Set ✓ (`production`) | — |
| `PORT` | Set ✓ (`5000`) | Render overrides automatically |
| `EMAIL_VERIFICATION_ENABLED` | Set ✓ (`false`) | Change to `"true"` when SMTP configured |

### Frontend (`hilgod-frontend` on Render)

| Variable | Value / Status | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Set ✓ | Developer's project |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Set ✓ | Corrected (was typo) |
| `NEXT_PUBLIC_API_URL` | Set ✓ (`https://hilgodonlineshop.onrender.com/api`) | Backend proxy target |
| `GOOGLE_CLIENT_ID` | Set ✓ | OAuth button |
| `NODE_ENV` | Set ✓ (`production`) | — |

---

*All credentials belong to the developer and must be rotated at handover. The developer's Supabase project should remain active until the client's own project is confirmed working.*
