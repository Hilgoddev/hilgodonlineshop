# Hilgod Online Store — Full Audit Report
**Last updated:** 2026-06-04
**Method:** Read-only live Supabase scan + Vercel CLI + multi-agent code audit + manual verification
**Focus:** Money/currency correctness, multi-vendor isolation, payment integrity, auth/access control

---

## 1. Live database findings (read-only scan)

| Check | Result |
|---|---|
| Orders before cleanup | 68 total — **64 pending**, 2 paid, 1 processing, 1 cancelled |
| `payment_events` | was **0** (no webhook ever fired) → now **≥1**: payment confirmation is working after the fixes + webhook config |
| Order currency | 100% NGN (consistent — settlement is NGN) |
| Anon-key access to `orders`/`order_items`/`profiles`/`seller_payouts`/`payment_events` | **0 rows (RLS blocks)** — no anonymous data leak |
| `products` anon read | Public (correct for storefront) |
| Money integrity | 0 products price≤0, 0 stock<0, 0 order_items unit_price≤0 |
| Multi-vendor | 1 legacy product + 1 order_item with NULL seller_id (legacy "Hilgod Shop" item) |
| Flash sales | 8 of 9 active rows are expired — cosmetic only (pricing util filters `expires_at > now`) |

**Action taken:** Deleted the 64 `pending` orders + 69 order_items (paid/processing/cancelled untouched).

---

## 2. CRITICAL bugs found & fixed

| # | Bug | Root cause | Fix (commit) |
|---|---|---|---|
| 1 | **Payment post-processing never ran** — no stock decrement, no buyer/seller/admin emails on successful payment | `paymentSuccess.js` selected `order_items.price` (column is `unit_price`); PostgREST error → function aborted on its guard | `cd07b7c` — use `unit_price` |
| 2 | **Double stock decrement** risk once webhook fixed | webhook + redirect-verify both set `paid` then ran post-processing | `cd07b7c` — atomic `.neq('status','paid').select()` claim in both paths |
| 3 | **Seller earnings inflated by unpaid orders** (payout integrity) | dashboard/analytics summed all order_items regardless of order status | `2570300` — `getPaidOrderIdSet()`, count paid/shipped/delivered only |
| 4 | **Admin marking bank-transfer/POD order paid** never decremented stock or notified sellers | `PUT /orders/:id` only sent a status email | `45bef15` — first non-paid→paid transition runs `handlePaymentSuccess` once (idempotent) |
| 5 | **Stripe form crash / wrong currency** | `loader:'eager'` invalid option; forced USD overcharge | earlier — `loader:'auto'`, charge order's NGN currency |

---

## 3. Security & integrity hardening (this round)

| Area | Fix | File |
|---|---|---|
| **Reviews** | rating must be integer 1–5; one review per user/product (409); message/title length caps | `routes/reviews.js` |
| **Cart/Wishlist** | strict quantity parse (rejects NaN, clamps 1–99); productId type check | `routes/cart.js`, `routes/wishlist.js` |
| **Password change** | requires & verifies **current password** (GoTrue password grant) before change | `routes/user.js` |
| **Rate limits** | new `passwordLimiter`, `reviewLimiter`, `uploadLimiter`, `writeLimiter` applied to password, reviews, upload, returns, seller-apply, careers, payment-verify | `middleware/rateLimit.js` + routes |
| **Currency display** | guard against 0/non-finite exchange rates → no NaN/Infinity on screen | `contexts/CurrencyContext.js` |
| **Categories** | trim + length-bound name/slug | `routes/categories.js` |
| **db-test** | returns 404 in production (no infra disclosure) | `index.js` |
| **Env** | added `SUPABASE_ANON_KEY` to backend (needed for password verification) | Vercel + `.env` |

---

## 3b. Consistency & hardening — round 2

| Area | Fix |
|---|---|
| **Product detail consistency** | `GET /api/products/:id` now 404s inactive/unapproved products (matches listing + checkout) — a hidden product can't be opened or carted by direct URL |
| **Item status sync** | Admin order-status change now cascades to `order_items.fulfillment_status` (processing→packed, shipped/delivered/cancelled 1:1) — modal no longer shows "Item status: pending" on a shipped order |
| **Dashboard ⇄ orders page** | Admin dashboard recent-orders now derives `paymentStatus` identically to `/admin/orders` (shipped/delivered ⇒ paid) — the two views agree |
| **Reviews** | rating 1–5 integer, one per user/product (409), length caps, rate-limited |
| **Cart/Wishlist** | strict quantity (rejects NaN, clamps 1–99), productId type check |
| **Password** | `PUT /password` verifies current password (GoTrue) + rate-limited |
| **Rate limits** | password, reviews, upload, returns, seller-apply, careers, payment-verify |
| **Currency** | guard against 0/non-finite exchange rate (no NaN/Infinity on screen) |
| **Tables UI** | scrollbars hidden (scroll preserved) |
| **db-test** | 404 in production |

## 4. Verified NON-issues (flagged by agents, confirmed safe)

- **"Inline vs middleware = privilege escalation"** — FALSE. `PATCH /products/:id/status`, `PUT /orders/:id`, `POST /orders/:id/notify` all enforce `profile.role === 'admin'` inline. Functionally equivalent to middleware.
- **"SQL injection via categories.image_url"** — FALSE. Supabase JS parameterizes all values.
- **"Converted price leaks into order amount"** — FALSE. `normalizePricing` returns raw NGN; checkout sends NGN; server re-validates against NGN DB price. Multi-currency is display-only.
- **Anon RLS leak** — FALSE. Verified anon key returns 0 rows on all sensitive tables.

---

## 5. Access-control matrix (verified correct)

- All `/api/admin/*` → `verifyToken` + admin check (middleware or inline). ✅
- All `/api/seller/*` → `verifyToken` + seller/admin check; data scoped to `req.user.id` / seller's products. ✅
- Cart/wishlist/orders(GET)/user → scoped to `req.user.id` (no IDOR). ✅
- Payment init → `verifyToken` + `paymentInitLimiter` + order ownership. ✅
- Webhooks (paystack/stripe/grey) → HMAC/signature verified, idempotent via `payment_events`. ✅
- Backend uses Supabase **service role** for all queries (RLS bypassed server-side) — security rests on these per-route checks, which are present.

---

## 6. Outstanding — requires user action

| Item | Action |
|---|---|
| **Paystack webhook URL** | Set to `https://hilgod-api-two.vercel.app/api/payment/webhook` (or `https://api.hilgod.com/...` once live), event `charge.success`. **This is what fixes 0 payment_events / pending orders.** |
| **api.hilgod.com** | Resolve conflict: point to **Vercel backend** (cancel the Supabase custom-domain claim on `api`). Once green, frontend env flips to `https://api.hilgod.com/api`. |
| **Supabase custom domain** | Optional/cosmetic. If wanted, use a different subdomain (e.g. `auth.hilgod.com`), needs Pro plan. |
| **DNS cleanup** | Already done: single apex A `216.198.79.1`, single `www` CNAME. |

---

## 7. Remaining low-priority items (not yet done)

- `getEmailMap` caps at 1000 users (admin lists) — fine now (15 users), revisit past 1000.
- 1 legacy product/order_item with NULL `seller_id` — unattributable to a seller for payouts.
- All 480 products are `status=approved` — approval gate exists but nothing is pending; confirm new-product default is `pending` if review-before-listing is desired.
- Migration `007b` (reviews consolidation + `seller_payouts`) — confirmed run.
