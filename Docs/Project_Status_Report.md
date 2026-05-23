# Hilgod Online Shop — Project Status Report

**Prepared by:** Development Team
**Date:** 2026-05-06
**Platform:** Next.js (Frontend) + Express.js (Backend) + Supabase (Database + Auth)
**Payment Provider:** Paystack
**Hosting:** Render (Backend Web Service + Frontend Web Service)

---

## Executive Summary

The Hilgod Online Shop is a full-stack multi-vendor e-commerce platform currently **~72% complete**. Core infrastructure — authentication, product catalog, cart, orders, and an admin dashboard — is fully implemented and functional. The outstanding work is concentrated in email notifications, image upload, and a few security fixes.

The platform is currently running on **the developer's personal Supabase project and Paystack account**. Before going live with the client, they must provision their own accounts and supply the credentials listed in Section 5 of this report.

---

## 1. Completion Estimate by Module

| Module | Status | Completion |
|---|---|---|
| Authentication (Supabase Auth, Google OAuth, JWT) | Working | 95% |
| Product Catalog (listing, search, filter, single product) | Working | 90% |
| Shopping Cart (add, update, remove, persist) | Working | 95% |
| Wishlist | Working | 90% |
| Order Placement (create order, server-side price validation) | Working | 90% |
| Payment — Paystack (initialize, webhook, idempotency) | Working | 80% |
| Admin Dashboard (stats, orders, customers, products) | Working | 85% |
| Seller Application Flow (apply, admin approve/reject) | Working | 80% |
| Seller Dashboard (metrics, product management) | Working | 75% |
| Store Management (create, update, approval workflow) | Working | 80% |
| Product Reviews | Partial — no auth guard on POST | 55% |
| Categories (CRUD, admin-managed) | Working | 85% |
| Email Notifications | NOT implemented (stubs only) | 10% |
| Image Upload (product images, store logos, avatars) | NOT implemented — URL strings only | 20% |
| Seller Products Page (frontend UI) | Partial | 60% |
| Track Order Page | Frontend exists, backend incomplete | 40% |
| Delivery/Shipping Calculation | Page exists, not implemented | 15% |
| Password Reset Flow | Supabase handles email, no custom UI | 50% |
| Multi-currency Support | Context set up, not fully wired | 40% |

**Overall Estimated Completion: ~72%**

---

## 2. What Is Working

### Authentication
- Email/password signup and login via Supabase Auth
- Google OAuth login and signup
- JWT token verification on all protected backend routes
- Automatic profile sync on first login
- Role-based access control: `customer`, `seller`, `admin`

### Product Catalog
- Dynamic product listing with search, category filter, and pagination
- Single product detail page
- Admin approve/reject products — only approved + active products show publicly
- Sellers can create, update, and soft-delete their own products

### Cart and Wishlist
- Persistent server-side cart (survives browser close/refresh)
- Add, update quantity, remove items, clear cart
- Wishlist with add/remove

### Orders
- Order creation with server-side price validation (price tampering rejected at server)
- Stock validation at order time
- Order history per user
- Admin can view all orders and update statuses

### Payment (Paystack)
- Payment initialization with amount verified server-side
- Paystack webhook with HMAC-SHA512 signature verification
- Idempotent event processing — duplicate webhooks safely ignored
- Order automatically marked `paid` on successful `charge.success` event
- Cart cleared after successful payment

### Admin Dashboard
- Stats: total products, orders, customers, revenue, pending approvals
- Customer list with order count and total spent per user
- Product management with approve/reject/status controls
- Order management with status updates
- Seller application review (approve/reject)
- Store approval workflow
- Category management (CRUD)

### Seller Features
- Seller application submission
- Application status tracking
- Seller dashboard with sales metrics
- Store creation and profile management

---

## 3. What Is NOT Working / Incomplete

### Critical — Fixed in This Session

| Issue | File | Resolution |
|---|---|---|
| Backend crashes on startup | `backend/src/middleware/rateLimit.js` | FIXED — `paymentInitLimiter` was missing from exports |
| All API calls silently return `undefined` | `frontend/lib/apiClient.js` | FIXED — broken `lodash.debounce` wrapper removed; lodash not even installed |
| `paystack-api` npm package not declared | `backend/package.json` | FIXED — added to dependencies; run `npm install` in `/backend` |

### Critical — Needs Client Action Before Go-Live

| Issue | Description |
|---|---|
| Uses developer's Supabase account | Client must create their own Supabase project and replace all credentials |
| Uses developer's Paystack account | Client must register their own Paystack business account |
| Paystack webhook URL points to dev server | After deploy, client must update webhook URL in Paystack dashboard |

### Important — Needs Development Work

| Issue | Description |
|---|---|
| No email notifications | Seller approval, order status changes use `console.log` stubs only |
| No image upload | Product images stored as URL strings — no actual file upload capability |
| Unauthenticated order lookup | `GET /api/orders/:id` missing auth — anyone can read an order by ID |
| Reviews have no auth guard | `POST /api/reviews` accepts any name/email — no identity binding |
| Profiles table fully public | All user PII (name, phone, address) readable unauthenticated via anon key |
| Seller dashboard pulls all orders in memory | Should filter at DB level, not in Node.js |

### Minor / Polish

| Issue | Description |
|---|---|
| Track Order page | Frontend page exists but not fully wired to authenticated API |
| Delivery/shipping page | Static page, no calculation logic |
| Multi-currency | `CurrencyContext` exists, prices served in NGN only |
| Password reset UI | No custom page — relies on Supabase default email link |
| `.env.example` outdated | Still references MongoDB/NextAuth from old architecture |

---

## 4. Current Architecture

```
CLIENT BROWSER
  Next.js 16 (React 19)
  /api/* rewrites to Backend on Render
         |
         | HTTPS
         v
RENDER — BACKEND (Express.js 5)
  Routes: auth, products, orders, payment,
          admin, seller, cart, wishlist,
          categories, stores, reviews
  Middleware: helmet, cors, morgan, rate-limit
         |
         | Supabase JS Client (service_role key)
         v
SUPABASE (PostgreSQL)
  Tables: profiles, products, orders, order_items,
          cart_items, wishlist_items, stores,
          seller_applications, categories,
          reviews, payment_events
  Auth: Supabase Auth (email + Google OAuth)
         ^
         | Webhook (HMAC-SHA512 verified)
PAYSTACK
  Payment gateway for NGN transactions
  Webhook endpoint: POST /api/payment/webhook
```

---

## 5. Client Credentials Required (Action Items for Handover)

The platform currently runs on the developer's personal accounts. **All of the following must be replaced with the client's own accounts before handover.**

### 5.1 Supabase (Database + Auth)

1. Create account at https://supabase.com
2. Create a new project (choose `eu-west-2` region for Nigeria proximity)
3. Go to **SQL Editor**, paste and run the entire `backend/supabase/schema.sql` file
4. Collect from **Project Settings > API**:

| Variable | Where to Find |
|---|---|
| `SUPABASE_URL` | Project Settings > API > Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Project Settings > API > service_role (keep SECRET — never expose to frontend) |
| `NEXT_PUBLIC_SUPABASE_URL` | Same as SUPABASE_URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Project Settings > API > anon (safe to expose in frontend) |

### 5.2 Paystack (Payments)

1. Register at https://paystack.com (free for Nigerian businesses)
2. Complete KYC/business verification for live NGN payments
3. Collect from **Settings > API Keys and Webhooks**:

| Variable | Where to Find |
|---|---|
| `PAYSTACK_SECRET_KEY` | Settings > API Keys > Live Secret Key |

4. Configure webhook URL in Paystack dashboard:
   - Settings > API Keys and Webhooks > Webhooks
   - Add: `https://YOUR-BACKEND.onrender.com/api/payment/webhook`
   - Events: enable `charge.success`

### 5.3 Google OAuth (for Google Login feature)

1. Go to https://console.cloud.google.com
2. Create project > Enable Google+ API
3. OAuth consent screen > set app name and support email
4. Credentials > Create OAuth 2.0 Client ID (Web application)
5. Add authorized redirect URI: `https://YOUR-SUPABASE-PROJECT.supabase.co/auth/v1/callback`
6. Copy Client ID and Secret
7. Enter in Supabase Dashboard > Authentication > Providers > Google

### 5.4 Backend Environment Variables (Complete List)

Set these as environment variables on Render (never commit to git):

```
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
PAYSTACK_SECRET_KEY=sk_live_...
NODE_ENV=production
PORT=5000
FRONTEND_URL=https://YOUR-FRONTEND.onrender.com
```

### 5.5 Frontend Environment Variables (Complete List)

Set these as environment variables on Render for the frontend service:

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
NEXT_PUBLIC_API_URL=https://YOUR-BACKEND.onrender.com
GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID
```

---

## 6. Platform User Guide

### 6.1 Customer Flow

1. **Browse Products** — Visit the homepage or `/products`. Filter by category or search by name.
2. **Register / Login** — Click Sign Up or Login from the navbar. Google login is also available.
3. **Add to Cart** — Click Add to Cart on any product.
4. **Checkout** — Review your cart, enter a shipping address, and select a payment method.
5. **Pay with Paystack** — Redirected to Paystack secure checkout. After payment, the order is automatically marked paid.
6. **View Orders** — Go to My Account > Orders to check order history and status.
7. **Wishlist** — Save items using the heart icon on product cards.

### 6.2 Seller Flow

1. **Apply to Become a Seller** — Go to `/seller-zone` and fill out the application (business name, category, phone, email).
2. **Wait for Admin Approval** — Admin reviews your application.
3. **On Approval** — Your role changes to `seller`. The Seller Dashboard at `/seller/dashboard` becomes accessible.
4. **Create a Store** — Go to `/seller/store` to create a storefront (name, URL slug, description, logo URL).
5. **Add Products** — Go to `/seller/products` to list products. New products start as `pending`.
6. **Product Approval** — Admin must approve each product before it appears publicly.
7. **Track Sales** — Seller dashboard shows total revenue, units sold, and your product catalog.

### 6.3 Admin Flow

1. **Access Admin Dashboard** — Account must have `role = 'admin'`. Navigate to `/admin`.
2. **Dashboard Overview** — Live platform stats: total products, orders, revenue, customers, pending approval count.
3. **Approve Products** — `/admin/products` — approve or reject seller-submitted products.
4. **Manage Orders** — `/admin/orders` — view all orders, update status: pending > processing > shipped > delivered.
5. **Approve Sellers** — `/admin/approvals` — review and action seller applications.
6. **Approve Stores** — `/admin/stores` — review and action store registration requests.
7. **Manage Customers** — `/admin/customers` — view all users, promote/demote roles.
8. **Categories** — `/admin/categories` — add and manage product categories.

### 6.4 Making the First Admin Account (First-Time Setup)

1. Sign up on the platform normally to create an account
2. Go to **Supabase Dashboard > Table Editor > profiles**
3. Find your row (identifiable by username matching your email prefix)
4. Edit the `role` column from `customer` to `admin`
5. Refresh the platform — you now have full admin access

---

## 7. Remaining Development Effort

| Task | Priority | Estimated Effort |
|---|---|---|
| Email notifications (Resend/SendGrid/Postmark integration) | High | 1-2 days |
| Image upload (Supabase Storage or Cloudinary) | High | 1-2 days |
| Fix unauthenticated order lookup (add auth check) | High | 2 hours |
| Fix seller dashboard to filter orders at DB level | Medium | 1 hour |
| Fix profiles RLS policy (restrict public read) | High | 1 hour |
| Fix reviews — add authentication guard | Medium | 2 hours |
| Track order page — wire to authenticated backend | Medium | 3 hours |
| Multi-currency backend support | Low | 3-5 days |
| Password reset custom UI | Low | 1 day |
| Shipping/delivery rate calculation | Low | 3-5 days |
| Update `.env.example` to reflect current stack | Low | 30 minutes |

**Estimated total remaining effort to fully production-ready: 5-8 working days**

---

## 8. Notes for Handover

- Run `npm install` in both `/backend` and `/frontend` after cloning to a new machine
- Run `backend/supabase/schema.sql` exactly once on the client's new Supabase project
- All current `.env` credentials (Supabase + Paystack) belong to the developer and must be rotated/invalidated after the client sets up their own accounts
- The Paystack webhook URL must be updated in the Paystack dashboard to point to the client's live Render backend URL
- The developer's Supabase project should remain active until the client confirms their own project is fully working, then can be decommissioned
