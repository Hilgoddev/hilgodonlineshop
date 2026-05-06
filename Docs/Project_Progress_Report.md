# Hilgod Online Shop — Project Progress Report

**Prepared by:** Development Team  
**Date:** 2026-05-06  
**Stack:** Next.js 16 (Frontend) · Express.js 5 (Backend) · Supabase (PostgreSQL + Auth) · Paystack (Payments)  
**Hosting:** Render — two live Web Services  

---

## Live URLs

| Service | URL | Status |
|---|---|---|
| Frontend | https://hilgod-frontend.onrender.com | Live |
| Backend API | https://hilgodonlineshop.onrender.com | Live |
| API Health | https://hilgodonlineshop.onrender.com/api/health | Healthy |

---

## Overall Completion: ~80%

Core infrastructure is fully deployed and functional. The remaining 20% is concentrated in email notifications, image upload, a few security hardening items, and the client's own third-party account setup.

---

## 1. What Was Done This Session (Fixes & Deployments)

### Critical Bugs Fixed

| Bug | Impact Before Fix | Resolution |
|---|---|---|
| Backend crash on startup | Server would not start at all | Added missing `paymentInitLimiter` export to `rateLimit.js` — Express 5 throws on undefined middleware |
| All API calls returning `undefined` | Every button and page action silently failed | Removed broken `lodash.debounce` wrapper from `apiClient.js`; lodash was not installed |
| `paystack-api` not declared | Backend would crash when payment routes loaded | Added `paystack-api` to `backend/package.json` dependencies |

### Hosting Fixed (Render)

| Issue | Resolution |
|---|---|
| Frontend deployed as a static site | Rebuilt as a proper Node.js Web Service — Next.js with SSR cannot run as a static site |
| Backend running in dev mode (`node --watch`) | Fixed start command to `node src/index.js` |
| Frontend `NEXT_PUBLIC_API_URL` pointed to `localhost` | Updated to `https://hilgodonlineshop.onrender.com/api` |
| Frontend build skipping devDependencies | Updated build command to `npm install --include=dev && npm run build` |
| Old broken static site still running | Deleted from Render |
| Wrong Supabase anon key on Render (one-character typo `mmrq` vs `nmrq`) | Corrected — was causing 401 on every Supabase call on the live site |

### Authentication Fixed

| Issue | Resolution |
|---|---|
| Signup redirected to login without email confirmation — login returned 400 | Signup now detects if email confirmation is pending and shows a proper modal |
| Email verification blocking all signups | Added `POST /api/auth/auto-confirm` backend endpoint; controlled by `EMAIL_VERIFICATION_ENABLED` env flag |
| Unconfirmed user (`hilgoddev@gmail.com`) locked out | Confirmed via Supabase admin API |

### Frontend Polish

| Fix | Detail |
|---|---|
| Google "G" logo blocked by OpaqueResponseBlocking | Wikipedia CDN blocks cross-origin embedding; logo now served locally from `/google-logo.svg` |
| Favicon 404 | Created `favicon.svg` (purple H) and `_document.js` to wire it into `<head>` |
| Vite service worker 404 spam | Created `public/dev-sw.js` that self-destructs to clear the stale SW |

### Database

| Action | Detail |
|---|---|
| 8 categories seeded | Electronics, Fashion, Home & Living, Beauty & Health, Sports & Fitness, Books & Stationery, Food & Groceries, Phones & Tablets |
| All 11 tables verified present | `profiles`, `categories`, `stores`, `products`, `orders`, `order_items`, `cart_items`, `wishlist_items`, `seller_applications`, `payment_events`, `reviews` |

---

## 2. What Is Working Right Now (Live)

### Authentication
- Email/password signup — creates account, auto-confirms, logs in immediately
- Email/password login
- Role-based redirect after login: `admin` → `/admin`, `seller` → `/seller/dashboard`, `customer` → `/account`
- Google OAuth configured (redirect URI must be updated in Google Console for live domain — see Section 5)

### Product Catalog
- Product listing with search, category filter, pagination
- Single product detail page
- Admin approve/reject products — only approved + active products show publicly
- Category browsing (8 categories seeded and live)

### Cart & Wishlist
- Persistent server-side cart (survives browser close)
- Add, update quantity, remove, clear
- Wishlist add/remove

### Orders
- Order creation with server-side price validation (price tampering rejected)
- Stock validation at order time
- Order history per user

### Payment (Paystack)
- Payment initialization with amount verified server-side
- Webhook with HMAC-SHA512 signature verification
- Idempotent event processing (duplicate webhooks safely ignored)
- Order auto-marked `paid` on successful `charge.success` event
- **NOTE: Paystack secret key is currently a placeholder — payments will fail until a real key is provided**

### Admin Dashboard
- Platform stats (products, orders, customers, revenue, pending approvals)
- Customer list
- Product approve/reject/status controls
- Order management with status updates
- Seller application review (approve/reject)
- Store approval workflow
- Category management (CRUD)

### Seller Features
- Seller application submission
- Application status tracking
- Seller dashboard with sales metrics
- Store creation and profile management

### Infrastructure
- Both Render services live and auto-deploying on every GitHub push
- Rate limiting on all API routes (general + admin + payment)
- Helmet security headers
- CORS locked to the frontend URL
- Paystack webhook endpoint registered and ready

---

## 3. What Is Missing / Incomplete

### Requires Development Work

| Feature | Priority | Estimated Effort |
|---|---|---|
| Email notifications (order status, seller approval) | High | 1–2 days |
| Image upload (currently URL strings only — no real file upload) | High | 1–2 days |
| Unauthenticated order lookup (`GET /api/orders/:id` has no auth guard) | High | 2 hours |
| Profiles RLS too permissive (all user PII readable by anyone with anon key) | High | 1 hour |
| Seller dashboard pulls all order_items then filters in Node memory | Medium | 1 hour |
| Reviews have no authentication guard (anyone can post as anyone) | Medium | 2 hours |
| Track Order page — frontend exists, backend not wired | Medium | 3 hours |
| Multi-currency support — context exists, NGN-only in practice | Low | 3–5 days |
| Shipping / delivery rate calculation — page exists, no logic | Low | 3–5 days |
| Password reset custom UI — relies on Supabase default email | Low | 1 day |
| Seller products page — partially implemented | Medium | 4 hours |

### Requires Client Action Before Go-Live

| Item | Notes |
|---|---|
| Live Paystack secret key | Placeholder currently in place — no payments work until real key added |
| Paystack webhook URL update | Must point to `https://hilgodonlineshop.onrender.com/api/payment/webhook` |
| Supabase Auth Site URL | Must be changed from `localhost` to `https://hilgod-frontend.onrender.com` in Supabase dashboard |
| Google OAuth redirect URI | Must add `https://nmrqdzikceakkhfhflja.supabase.co/auth/v1/callback` in Google Cloud Console |
| Client's own Supabase project | Currently running on developer's account — must be migrated before handover |
| Client's own Paystack account | Currently using developer's account |
| Re-enable email verification | Change `EMAIL_VERIFICATION_ENABLED=false` to `true` once SMTP is configured |

---

## 4. API Keys & Credentials Required

### Currently Active (Developer's Accounts — Must Be Replaced at Handover)

| Key | Where Used | Where to Find |
|---|---|---|
| `SUPABASE_URL` | Backend | Supabase Dashboard → Project Settings → API → Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Backend | Supabase Dashboard → Project Settings → API → service_role (**keep secret**) |
| `NEXT_PUBLIC_SUPABASE_URL` | Frontend | Same as `SUPABASE_URL` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Frontend | Supabase Dashboard → Project Settings → API → anon/public |

### Missing / Placeholder

| Key | Where Used | Status | Action Required |
|---|---|---|---|
| `PAYSTACK_SECRET_KEY` | Backend | **Placeholder `your-paystack-secret-key`** | Client registers at paystack.com, provides live `sk_live_...` key |

### Already Set (Functional)

| Key | Where Used | Status |
|---|---|---|
| `GOOGLE_CLIENT_ID` | Frontend + Backend | Set — Google OAuth login is configured |
| `GOOGLE_CLIENT_SECRET` | Backend | Set |
| `NODE_ENV=production` | Both | Set |
| `FRONTEND_URL` | Backend CORS | Set to `https://hilgod-frontend.onrender.com` |
| `EMAIL_VERIFICATION_ENABLED=false` | Backend | Set — flip to `true` to require email confirmation |

### Keys Needed When Adding Future Features

| Feature | Service | Approximate Cost |
|---|---|---|
| Email notifications | Resend, SendGrid, or Postmark | Free tier available (Resend recommended) |
| Image upload | Supabase Storage (already available) or Cloudinary | Free tier available |

---

## 5. Client Setup Checklist (Before Handover)

### Step 1 — Supabase (Database + Auth)
- [ ] Create new Supabase project at https://supabase.com
- [ ] Run `backend/supabase/schema.sql` in the SQL Editor
- [ ] Collect `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] In Supabase Dashboard → Authentication → URL Configuration:
  - Set **Site URL** to `https://hilgod-frontend.onrender.com`
  - Add **Redirect URL**: `https://hilgod-frontend.onrender.com/auth/login`
- [ ] Update all Supabase env vars on Render (both services)

### Step 2 — Paystack (Payments)
- [ ] Register at https://paystack.com (free for Nigerian businesses)
- [ ] Complete KYC/business verification for live NGN payments
- [ ] Get live secret key: Settings → API Keys → Live Secret Key
- [ ] Update `PAYSTACK_SECRET_KEY` on Render backend (replace placeholder)
- [ ] Add webhook: Settings → Webhooks → `https://hilgodonlineshop.onrender.com/api/payment/webhook` → event: `charge.success`

### Step 3 — Google OAuth
- [ ] Go to https://console.cloud.google.com
- [ ] Open the OAuth 2.0 Client ID for this project
- [ ] Under **Authorized redirect URIs**, add: `https://[CLIENT-SUPABASE-PROJECT].supabase.co/auth/v1/callback`
- [ ] In new Supabase project → Authentication → Providers → Google: enter Client ID and Secret

### Step 4 — First Admin Account
- [ ] Sign up on the live platform
- [ ] In Supabase Dashboard → Table Editor → profiles → set `role` to `admin` for your account

### Step 5 — Email Verification (When Ready)
- [ ] Set up email provider (recommend Resend.com — free 3,000 emails/month)
- [ ] Configure in Supabase → Authentication → SMTP Settings
- [ ] Change `EMAIL_VERIFICATION_ENABLED` from `false` to `true` on Render backend → redeploy

---

## 6. Module Completion Breakdown

| Module | Status | % |
|---|---|---|
| Authentication (Supabase Auth, JWT, role-based access) | Working on live | 95% |
| Hosting & Deployment (Render, CI/CD, env vars) | Fully live | 95% |
| Product Catalog (listing, search, filter, detail page) | Working | 90% |
| Shopping Cart (add, update, remove, persist) | Working | 95% |
| Wishlist | Working | 90% |
| Order Placement (server-side price validation, stock check) | Working | 90% |
| Payment — Paystack (init, webhook, idempotency) | Code ready, key missing | 70% |
| Admin Dashboard (stats, orders, customers, products) | Working | 85% |
| Seller Application Flow (apply, admin approve/reject) | Working | 85% |
| Seller Dashboard (metrics, product management) | Working | 75% |
| Store Management (create, update, approval workflow) | Working | 80% |
| Categories (CRUD, admin-managed, seeded) | Working | 90% |
| Email Notifications | Not implemented (stubs only) | 10% |
| Image Upload | Not implemented (URL strings only) | 20% |
| Product Reviews | Partial — no auth guard on POST | 55% |
| Track Order Page | Frontend exists, backend incomplete | 40% |
| Delivery/Shipping Calculation | Page exists, no logic | 15% |
| Password Reset Flow | Supabase default only, no custom UI | 50% |
| Multi-currency Support | Context set up, NGN-only in practice | 40% |

**Overall Estimated Completion: ~80%**

---

## 7. Remaining Effort to Production-Ready

| Priority | Task | Effort |
|---|---|---|
| **Critical** | Add Paystack live secret key | 5 min (client action) |
| **Critical** | Update Supabase Auth Site URL in dashboard | 5 min (client action) |
| **Critical** | Fix unauthenticated order lookup (auth guard) | 2 hours |
| **Critical** | Fix profiles RLS to restrict public PII access | 1 hour |
| High | Email notifications (Resend integration) | 1–2 days |
| High | Image upload (Supabase Storage) | 1–2 days |
| Medium | Fix reviews auth guard | 2 hours |
| Medium | Fix seller dashboard DB-level order filter | 1 hour |
| Medium | Wire Track Order page to backend | 3 hours |
| Medium | Complete seller products UI | 4 hours |
| Low | Multi-currency backend support | 3–5 days |
| Low | Shipping/delivery calculation | 3–5 days |
| Low | Password reset custom UI | 1 day |

**Estimated remaining effort to fully production-ready: 4–7 working days**  
*(Excluding multi-currency and shipping, which are optional for initial launch)*

---

## 8. Architecture Reference

```
BROWSER
  Next.js 16 (React 19) — https://hilgod-frontend.onrender.com
  /api/* rewrites → Backend (server-side proxy, no CORS in browser)
        |
        | HTTPS
        v
RENDER — EXPRESS.JS 5 BACKEND — https://hilgodonlineshop.onrender.com
  Routes: auth, products, orders, payment, admin,
          seller, cart, wishlist, categories, stores, reviews
  Middleware: helmet, cors, morgan, rate-limit
        |
        | supabase-js (service_role key — bypasses RLS)
        v
SUPABASE — PostgreSQL (project: nmrqdzikceakkhfhflja)
  11 tables — RLS enabled on all
  Auth: Supabase Auth (email/password + Google OAuth)
        ^
        | Webhook (HMAC-SHA512 verified)
PAYSTACK — NGN payment gateway
  Webhook: POST /api/payment/webhook
```

---

*Report generated: 2026-05-06. Platform hosted on developer's accounts — all credentials must be rotated when handed over to the client.*
