# Hilgod Online Store — Full Project Audit
**Date:** 2026-06-02 | **Last updated:** 2026-06-02  
**Auditor:** Automated code + architecture review  
**Scope:** Full-stack — Next.js 16 frontend, Express 5 backend, Supabase, Vercel Hobby

---

## 1. Architecture

| Layer | Technology | Host |
|---|---|---|
| Frontend | Next.js 16 (Pages Router), React 19, Supabase Auth | Vercel Hobby |
| Backend API | Express 5, Supabase JS v2 | Vercel Serverless (10 s limit) |
| Database | Supabase PostgreSQL (free tier) | Supabase |
| Payments | Paystack (live), Stripe (secondary), Grey (wired, no key) | — |
| Email | Resend API | — |
| Storage | Cloudinary / Supabase Storage | — |

---

## 2. Full Route Inventory

### Backend (`/api/*`)

| Route | Auth | Status | Notes |
|---|---|---|---|
| `GET /api/health` | None | ✅ | |
| `GET /api/db-test` | None | ✅ | Frontend access via AdminGuard |
| `GET /api/products` | None | ✅ | 60 s cache, single-flight coalescing |
| `GET /api/products/:id` | None | ✅ | |
| `POST /api/products` | Seller/Admin | ✅ | |
| `PUT /api/products/:id` | Seller/Admin | ✅ | |
| `DELETE /api/products/:id` | Seller/Admin | ✅ | |
| `GET /api/orders` | Customer | ✅ | Own orders only |
| `POST /api/orders` | Customer | ✅ | Server-side price + stock validation |
| `GET /api/orders/all` | Admin | ✅ | Paginated, 30 s cache with bust on PUT |
| `GET /api/orders/:id` | Owner/Admin | ✅ | Ownership checked |
| `PUT /api/orders/:id` | Admin | ✅ | Status update + email + cache bust |
| `POST /api/orders/:id/notify` | Admin | ✅ | Custom email composer |
| `POST /api/payment/initiate` | Customer | ✅ | 7 s + 6 s timeouts, BOM-cleaned key |
| `POST /api/payment/initialize` | Customer | ✅ | Alias for above |
| `POST /api/payment/webhook` | None (HMAC) | ✅ | Idempotent via `payment_events` |
| `GET /api/payment/verify/:ref` | Customer | ✅ | Syncs order on Paystack redirect |
| `GET /api/payment/bank-details` | None | ✅ | |
| `POST /api/stripe/create-payment-intent` | Customer | ✅ | Graceful 503 if unconfigured |
| `POST /api/stripe/webhook` | None (sig) | ✅ | Idempotent, calls handlePaymentSuccess |
| `POST /api/grey/create-payment` | Customer | ⚠️ | Returns 503 (no GREY_API_KEY) |
| `POST /api/grey/webhook` | None (HMAC) | ⚠️ | Wired but untested |
| `POST /api/auth/sync-profile` | Customer | ✅ | |
| `POST /api/auth/auto-confirm` | None | ✅ | Disabled unless EMAIL_VERIFICATION=false |
| `GET /api/auth/me` | Customer | ✅ | 30 s profile cache |
| `GET /api/user/profile` | Customer | ✅ | |
| `PUT /api/user/profile` | Customer | ✅ | |
| `PUT /api/user/password` | Customer | ✅ | |
| `GET /api/admin/stats` | Admin | ✅ | Real revenue, all-orders breakdown, 6-month trend |
| `GET /api/admin/customers` | Admin | ✅ | Real emails via batched getEmailMap |
| `GET /api/admin/sellers` | Admin | ✅ | |
| `DELETE /api/admin/customers/:id` | Admin | ✅ | Cannot delete self or another admin |
| `PUT /api/admin/promote` | Admin | ✅ | Auto-creates store on seller promotion |
| `GET /api/admin/seller-applications` | Admin | ✅ | |
| `POST /api/admin/approve-seller/:id` | Admin | ✅ | Creates store, sends email |
| `POST /api/admin/reject-seller/:id` | Admin | ✅ | |
| `GET /api/admin/riders` | Admin | ✅ | |
| `PUT /api/admin/riders/:id` | Admin | ✅ | Approval/rejection emails |
| `DELETE /api/admin/riders/:id` | Admin | ✅ | |
| `GET /api/seller/dashboard` | Seller | ✅ | |
| `GET /api/seller/analytics` | Seller | ✅ | |
| `GET /api/seller/orders` | Seller | ✅ | Items scoped to seller's products |
| `PATCH /api/seller/order-items/:id/status` | Seller | ✅ | Stock restore on cancel |
| `POST /api/seller/apply` | Customer | ✅ | |
| `GET /api/seller/application-status` | Customer | ✅ | |
| `GET /api/flash-sales` | None | ✅ | Active only |
| `GET /api/flash-sales/all` | Admin | ✅ | |
| `POST /api/flash-sales` | Admin | ✅ | |
| `PUT /api/flash-sales/:id` | Admin | ✅ | |
| `DELETE /api/flash-sales/:id` | Admin | ✅ | |
| `GET /api/categories` | None | ✅ | |
| `GET /api/stores` | None | ✅ | Approved only |
| `GET /api/stores/all` | Admin | ✅ | Product count per store |
| `GET /api/reviews/:productId` | None | ✅ | Uses canonical `reviews` table |
| `POST /api/reviews` | Customer | ✅ | Profile-sourced name/email |
| `GET /api/returns` | Admin | ✅ | |
| `POST /api/returns` | Customer | ✅ | Ownership + email verified |
| `PATCH /api/returns/:id` | Admin | ✅ | Stock restore on approved/refunded |
| `GET /api/wishlist` | Customer | ✅ | |
| `POST /api/wishlist` | Customer | ✅ | |
| `DELETE /api/wishlist` | Customer | ✅ | |
| `GET /api/cart` | Customer | ✅ | |
| `POST /api/cart` | Customer | ✅ | |
| `DELETE /api/cart` | Customer | ✅ | |
| `POST /api/upload` | Seller | ✅ | |
| `GET /api/exchange-rates` | None | ✅ | |
| `POST /api/newsletter/subscribe` | None | ✅ | Rate-limited 5/hour |
| `POST /api/delivery/apply` | None | ✅ | Rate-limited 3/hour |

### Frontend Pages

| Page | Guard | Status | Notes |
|---|---|---|---|
| `/` | None | ✅ | SSR limit=20 |
| `/products` | None | ✅ | Hybrid SSR+client pagination |
| `/products/[id]` | None | ✅ | x-forwarded-proto fix applied |
| `/checkout` | AuthGuard | ✅ | Paystack verify on redirect (fixed) |
| `/account` | AuthGuard | ✅ | Real-time order status updates |
| `/account` (admin) | — | ✅ | Auto-redirects to `/admin/orders` |
| `/account` (seller) | — | ✅ | Auto-redirects to `/seller/orders` |
| `/auth/login` | None | ✅ | |
| `/auth/signup` | None | ✅ | |
| `/auth/forgot-password` | None | ✅ | |
| `/auth/reset-password` | None | ✅ | |
| `/auth/callback` | None | ✅ | OAuth callback |
| `/cart` | None | ✅ | |
| `/wishlist` | None | ✅ | |
| `/blog` | None | ✅ | Static posts |
| `/blog/[slug]` | None | ✅ | Individual post pages |
| `/track-order` | None | ✅ | Redirects → `/account?tab=orders` |
| `/return-request` | None | ✅ | Now uses `apiFetch` with auth token |
| `/flash-sales` | None | ✅ | |
| `/categories` | None | ✅ | |
| `/seller-zone` | None | ✅ | Apply page |
| `/seller/dashboard` | SellerGuard | ✅ | Payouts link added |
| `/seller/products` | SellerGuard | ✅ | |
| `/seller/orders` | SellerGuard | ✅ | Real-time + 30 s poll |
| `/seller/store` | SellerGuard | ✅ | |
| `/seller/analytics` | SellerGuard | ✅ | |
| `/seller/payouts` | SellerGuard | ✅ | Page exists; backend endpoints pending |
| `/admin` | AdminGuard | ✅ | |
| `/admin/analytics` | AdminGuard | ✅ | Correct revenue, monthly trend |
| `/admin/orders` | AdminGuard | ✅ | Email composer, real-time + 30 s poll |
| `/admin/products` | AdminGuard | ✅ | |
| `/admin/categories` | AdminGuard | ✅ | |
| `/admin/stores` | AdminGuard | ✅ | Product count per store |
| `/admin/sellers` | AdminGuard | ✅ | |
| `/admin/customers` | AdminGuard | ✅ | |
| `/admin/approvals` | AdminGuard | ✅ | |
| `/admin/flash-sales` | AdminGuard | ✅ | |
| `/admin/riders` | AdminGuard | ✅ | |
| `/admin/payouts` | AdminGuard | ✅ | Page exists; backend endpoints pending |
| `/system-test` | AdminGuard | ✅ | Fixed (was public) |
| `/about`, `/careers`, `/delivery`, `/privacy`, `/terms` | None | ✅ | Static |

---

## 3. Issues Fixed This Session

### Critical Fixes
| Issue | Resolution |
|---|---|
| **Payment status never updated after Paystack redirect** | `checkout.js` now calls `GET /api/payment/verify/:reference` on every Paystack return; syncs order → `paid`, fires emails |
| `PAYSTACK_SECRET_KEY` BOM contamination → 502 on every payment | `cleanEnv()` applied in `paystack.js` |
| Payment route exceeding Vercel 10 s limit | `withTimeout(7 s)` on DB fetch, `withTimeout(6 s)` on Paystack API |
| Product detail 404 on all Vercel production pages | `x-forwarded-proto` arrives as `"https,https"`; parse first value only |
| JWT auth taking 6–10 s per request | Local JWKS ES256 verification — microseconds, zero network |
| `jsonwebtoken` missing from `package.json` | Explicit dependency declared; Vercel install now includes it |
| BOM in `RESEND_API_KEY` → all emails silently dropped | `cleanEnv()` applied in `email.js` |
| `/return-request` sending unauthenticated requests | Switched to `apiFetch()` |
| Admin order modals showing `username` instead of real email | Batched `getEmailMap()` (one `listUsers` call, 60 s cache) |

### High Fixes
| Issue | Resolution |
|---|---|
| Admin revenue: only summed last 10 orders | Separate query across all paid/delivered orders |
| Status bar chart: only last 10 orders | Query all orders, group by status, show % share |
| `FRONTEND_URL` not cleaned in CORS config | `cleanEnv()` in `index.js` |
| Sellers count missing from analytics | Added `profiles WHERE role='seller'` count query |
| Admin orders cache not busted on status update | `ordersAllCache.delete()` in PUT handler |
| `/system-test` publicly accessible | Wrapped with `AdminGuard` |
| Admin nav missing Payouts link | Added |
| Seller dashboard missing Payouts link | Added "My Earnings" link |
| `clearCart()` called on payment failure | Moved to success-only paths |

### Medium Fixes
| Issue | Resolution |
|---|---|
| Production timing probes left in `payment.js` | Removed |
| Email templates linked to `/track-order` | Updated to `/account?tab=orders` |
| 007b migration crashing — `text = uuid` type mismatch | `::uuid` cast added to dynamic SQL |

---

## 4. Outstanding Items

### 4.1 ❌ CRITICAL — Google OAuth Client Secret in Repository
A `client_secret_662682454869-….json` file is committed to the project root. This is a **live credential**.

**Manual actions:**
1. Google Cloud Console → APIs & Services → Credentials → delete the OAuth client `662682454869-…`
2. Create a new OAuth 2.0 client; download new JSON
3. Add `client_secret_*.json` to `.gitignore`
4. Purge from git history: `git filter-repo --path client_secret_662682454869-….json --invert-paths`
5. Force-push: `git push client main --force`

### 4.2 ❌ HIGH — Paystack Webhook URL Not Configured
The backend webhook endpoint exists and is secure, but Paystack doesn't know the URL.  
Without it, status only updates via the frontend verify call (requires user to complete redirect).

**Action:** Paystack Dashboard → Settings → API Keys & Webhooks  
Webhook URL: `https://hilgod-api-two.vercel.app/api/payment/webhook`  
Event: `charge.success`

### 4.3 ❌ HIGH — `STRIPE_WEBHOOK_SECRET` Not Set
Every Stripe payment event returns 500. Set in Vercel backend env.

### 4.4 ❌ HIGH — Seller Payout Backend Endpoints Missing
Pages at `/seller/payouts` and `/admin/payouts` exist.  
`seller_payouts` table created (migration 007b).  
Backend endpoints not yet wired:
- `POST /api/seller/payouts` — request withdrawal
- `GET /api/seller/payouts` — seller history
- `GET /api/admin/payouts` — admin pending list
- `PATCH /api/admin/payouts/:id` — approve / reject

### 4.5 ❌ MEDIUM — Supabase Realtime Not Enabled
Admin + seller order pages subscribe to `postgres_changes` on `orders` / `order_items`.  
Subscriptions silently do nothing until Realtime is enabled in Supabase.

**Action:** Supabase Dashboard → Database → Replication → enable `orders`, `order_items`

### 4.6 ❌ MEDIUM — Run Migration 007b
Consolidates `product_reviews` → `reviews`. `::uuid` cast fix applied.  
Run `007b_fix_reviews_migration.sql` in Supabase SQL editor.

### 4.7 ❌ MEDIUM — `BANK_ACCOUNT_NUMBER` is `0000000000`
Customers choosing bank transfer see a fake account number.  
**Action:** Set real value in Vercel backend env.

### 4.8 ❌ LOW — `SUPPORT_PHONE` is `+123`
Appears in every transactional email footer.  
**Action:** Set real number in Vercel backend env: e.g. `+234XXXXXXXXXX`

### 4.9 ❌ LOW — Careers Page: No Application Tracking
"Send Your CV" opens a `mailto:` link. No form or DB storage.

**SQL to create table:**
```sql
CREATE TABLE IF NOT EXISTS career_applications (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name    TEXT NOT NULL,
  email        TEXT NOT NULL,
  role         TEXT,
  cv_url       TEXT,
  cover_letter TEXT,
  status       TEXT NOT NULL DEFAULT 'new',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE career_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_only" ON career_applications USING (false);
```

### 4.10 ⚠️ LOW — Grey Payment Gateway Inactive
Fully wired (`/api/grey/*`) but `GREY_API_KEY` is not set. Returns 503 gracefully.  
Either configure the key or remove the payment option from checkout.

---

## 5. Security Checklist

| Check | Status |
|---|---|
| JWT verified locally via JWKS (no per-request network) | ✅ |
| Paystack webhook HMAC-SHA512 verified | ✅ |
| Stripe webhook signature verified | ✅ |
| Server-side price validation (tamper-proof) | ✅ |
| Server-side stock validation | ✅ |
| Admin endpoints role-checked | ✅ |
| Seller endpoints role-checked | ✅ |
| Order ownership verified before payment | ✅ |
| Payment rate-limited (10 req/hour) | ✅ |
| General API rate-limited (500 req/15 min) | ✅ |
| BOM stripped from all env vars | ✅ |
| HTML escaped in all outbound emails | ✅ |
| CORS restricted to `FRONTEND_URL` (with cleanEnv) | ✅ |
| Helmet security headers | ✅ |
| Service role key never in frontend | ✅ |
| `/system-test` protected by AdminGuard | ✅ |
| `client_secret_*.json` removed from repo | ❌ **ACTION REQUIRED** |
| Stripe webhook secret configured | ❌ **ACTION REQUIRED** |

---

## 6. Performance

| Area | Mechanism | Status |
|---|---|---|
| Product list | 60 s cache, single-flight, stale-while-revalidate | ✅ |
| Admin stats | 30 s cache, bust on status update | ✅ |
| Email user map | Batched `listUsers`, 60 s cache shared across routes | ✅ |
| Auth verification | Local JWKS (~1 ms, cached 10 min) | ✅ |
| SSR page data | Capped at 20 products | ✅ |
| Supabase queries | AbortSignal + withTimeout on all long queries | ✅ |
| Payment route | Per-step time budgets (7 s DB + 6 s Paystack) | ✅ |
| Order real-time | Supabase channel + 30 s fallback poll | ✅ |

---

## 7. Environment Variables

### Backend (Vercel)
| Variable | Status |
|---|---|
| `SUPABASE_URL` | ✅ Set |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ Set |
| `PAYSTACK_SECRET_KEY` | ✅ Set |
| `RESEND_API_KEY` | ✅ Set |
| `FRONTEND_URL` | ✅ Should be `https://www.hilgod.com` |
| `ADMIN_EMAIL` | ✅ Set |
| `STRIPE_SECRET_KEY` | ⚠️ Set (verify live vs test) |
| `STRIPE_WEBHOOK_SECRET` | ❌ Missing |
| `BANK_ACCOUNT_NUMBER` | ❌ Still `0000000000` |
| `SUPPORT_PHONE` | ❌ Still `+123` |
| `GREY_API_KEY` | ⚠️ Not set (graceful 503) |

### Frontend (Vercel)
| Variable | Status |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ Set |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ Set |
| `NEXT_PUBLIC_API_URL` | ✅ Set |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | ⚠️ Needed for Stripe checkout |
| `NEXT_PUBLIC_STRIPE_ENABLED` | ⚠️ `true`/`false` |

---

## 8. Migration Status

| File | Status |
|---|---|
| `001_sync_sellers_stores.sql` | ✅ Run |
| `002_add_exchange_rates_table.sql` | ✅ Run |
| `004_stock_management_functions.sql` | ✅ Run |
| `005_stock_non_negative_constraint.sql` | ✅ Run |
| `006_product_indexes.sql` | ⚠️ Run manually (indexes) |
| `007b_fix_reviews_migration.sql` | ❌ **Run now** |
| `20260524_add_order_items_fulfillment_status.sql` | ✅ Run |

---

## 9. Priority Action List

| # | Priority | Action |
|---|---|---|
| 1 | 🔴 CRITICAL | Revoke & rotate Google OAuth client secret (§4.1) |
| 2 | 🔴 HIGH | Set Paystack webhook URL in Paystack dashboard (§4.2) |
| 3 | 🔴 HIGH | Set `STRIPE_WEBHOOK_SECRET` in Vercel (§4.3) |
| 4 | 🔴 HIGH | Set real `BANK_ACCOUNT_NUMBER` in Vercel (§4.7) |
| 5 | 🟡 MEDIUM | Run migration 007b in Supabase SQL editor (§4.6) |
| 6 | 🟡 MEDIUM | Enable Realtime on `orders` + `order_items` in Supabase (§4.5) |
| 7 | 🟡 MEDIUM | Implement seller payout backend endpoints (§4.4) |
| 8 | 🟢 LOW | Set `SUPPORT_PHONE` to real number in Vercel (§4.8) |
| 9 | 🟢 LOW | Add careers application form + table (§4.9) |
| 10 | 🟢 LOW | Configure or remove Grey payment gateway (§4.10) |
