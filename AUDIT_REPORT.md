# Hilgod Marketplace — Full System Audit Report (End-to-End Tested)

_Date: 2026-06-09 · Scope: backend (Express/Supabase) + frontend (Next.js) · Method: code review + live E2E testing_

## Summary

A full audit was performed across nine areas: Authentication & Authorization, Product
Management, Shopping Experience, Checkout & Payment, Order Management, Multi-Vendor,
Admin Dashboard, Security & Performance, and Infrastructure.

**Overall the system is well-built and security-conscious.** The authentication,
authorization, payment, and access-control layers are strong. The remaining risks are
systemic/operational (RLS reliance, serverless rate-limiting) rather than broken
endpoints. Several best-practice fixes were applied during the audit.

This pass was **tested end-to-end**, not just read: the frontend was built, the API was
booted and probed live, auth enforcement was exercised with/without tokens, and the core
business flows (metrics, payouts, campaigns, auto-approve, store page) were run against
the live database. Evidence below.

---

## End-to-end test evidence (2026-06-09)

| Test | Method | Result |
|------|--------|--------|
| Frontend build | `npm run build` | ✅ Compiled, 45/45 pages generated |
| Backend syntax | `node --check` ×36 files | ✅ 36/36 pass |
| API boot | `node src/index.js` | ✅ Server starts clean |
| Public endpoints | `curl` health, products, stores, categories, campaigns, flash-sales, exchange-rates | ✅ All HTTP 200 |
| Auth enforcement (no token) | `curl` seller/dashboard, admin/stats, orders, seller/earnings, user/profile | ✅ All 401 |
| Auth enforcement (writes) | `curl POST` campaigns, products | ✅ All 401 |
| Forged token | `curl` admin/stats with fake bearer | ✅ 401 rejected |
| Frontend secret exposure | grep for service-role / secret keys in `frontend/` | ✅ None found |
| Role guards | `AdminGuard`/`SellerGuard` resolve role via `/api/auth/me` (DB) | ✅ Redirect non-matching roles |
| Seller metrics | live recompute per seller | ✅ Populate (sales/units/revenue) |
| Payout vs activity split | live recompute | ✅ `processing` counts as sales but is excluded from withdrawable balance |
| Campaign pricing engine | `getActiveFlashSaleMap()` | ✅ Callable, returns override Map |
| Auto-approve setting | `getSetting('auto_approve_products')` | ✅ Reads live value (currently **ON**) |
| Store page data | live store + product count | ✅ Approved store resolves to its products |
| Migrations 009/010/011 | live schema probe | ✅ Applied & seeded |

---

## Git history & secret scan

- **Co-authored-by / "Claude" lines:** none across all 144 commits.
- **`.env` files:** never committed; `.gitignore` excludes all `.env*`. Only `frontend/.env.example` (placeholder) is tracked.
- **Secret keys:** no full/usable key, service-role JWT, or Resend key was ever committed.
  Truncated, non-usable fragments (`sk_live_86e7...`) existed only in `HANDOVER_AUDIT.md`
  and were **redacted** (commit `b538d7a`). Per the client's decision, history was **not**
  rewritten (fragments are non-usable; a 144-commit force-push to the shared repo was judged
  not worth the disruption). Client will rotate live keys themselves as a precaution.

---

## What was verified as solid

| Area | Finding |
|------|---------|
| Authentication | Supabase JWTs verified locally via JWKS (ES256/RS256) with a network fallback. |
| Authorization | Every privileged route checks `profiles.role` from the DB — the JWT role claim is never trusted. Admin, seller, and seller-or-admin guards applied consistently. |
| Access control (IDOR) | Orders, cart, wishlist, and payments are all scoped to `user_id`; `GET /orders/:id` enforces owner-or-admin. No cross-user access found. |
| Payments | Paystack (HMAC-SHA512, timing-safe) and Stripe (`constructEvent`) webhooks verify signatures. Both use a `payment_events` idempotency barrier and re-verify the paid amount against the order total server-side. Prices are recomputed server-side; client amounts are treated only as a tamper signal. |
| Product management | Seller create/update/delete enforce `seller_id` ownership; public listings filter to approved + active. |
| Admin | All `/api/admin/*` routes require admin role and use a dedicated rate limiter. |
| Hardening | `helmet`, CORS allowlist, raw-body webhook ordering, HTML-escaped emails, 5xx masking in production, request IDs, and per-action rate limiters (review/upload/password/write) are all in place. |

---

## Cross-user isolation — can User A affect User B?

Every endpoint that reads or mutates user-owned data was checked. **No path lets one
user read or modify another user's data.** All cross-account actions are admin-gated.

| Endpoint | Isolation control | Result |
|----------|-------------------|--------|
| `GET/PUT /user/profile` | Scoped to `req.user.id`; only `full_name`/`avatar` editable | A can't touch B; no role escalation |
| `PUT /user/password` | Own ID only; current password re-verified first | A can't reset B's password; hijacked session can't lock out owner |
| `auth/sync-profile` | Role forced to existing-or-`customer`, client role ignored | No self-promotion to seller/admin |
| `GET /orders/:id` | Owner-or-admin check | A can't view B's order |
| `POST /returns` | Order ownership **and** email match required | A can't file a return on B's order |
| `POST /reviews` | Author identity from verified token; one per user; no edit/delete-others | A can't post/alter reviews as B |
| `cart` / `wishlist` | All queries filtered by `user_id` | A can't see/change B's cart or wishlist |
| `products` (seller) | Update/delete enforce `seller_id = req.user.id` | Seller A can't edit B's products |
| `stores` (seller) | Update enforces `owner_id = req.user.id` | Seller A can't edit B's store |
| `seller/order-items/:id` | Enforces `product.seller_id = req.user.id` | Seller A can't change B's fulfilment |
| Payments (init/intent) | Order fetched with `eq('user_id', req.user.id)` | A can't pay for / probe B's order |

Conclusion: cross-user isolation is **clean and consistent**.

---

## Fixes applied in this audit

1. **Environment validation now hard-fails in production**
   `validateEnv` previously only warned on missing secrets, so the app could boot in a
   broken state (e.g. unverifiable webhooks). It now throws on startup in production if a
   required key is missing, while still only warning in development.
   _File: `backend/src/scripts/validateEnv.js`_

2. **Stripe webhook now uses an atomic paid-transition claim**
   Brought the Stripe handler in line with Paystack: the order is flipped to `paid` with a
   `.neq('status','paid')` guard so the one-time side-effects (stock decrement, emails) run
   exactly once even if a duplicate event arrives.
   _File: `backend/src/routes/stripe.js`_

3. **Consolidated the `requireAdmin` middleware**
   The admin-role check was duplicated inline across four route files. They now all import
   the single shared `middleware/requireAdmin`, removing drift risk.
   _Files: `campaigns.js`, `categories.js`, `flash-sales.js`, `stores.js`_

4. **Order emails show buyer name + date instead of a raw user ID**
   The admin "new paid order" email previously printed `Buyer user ID: <uuid>`. It now shows
   `Customer: <name> · Date: <order date>`. The seller "new order" email also gained the
   customer name + date (useful when packing for dispatch). Buyer identity is resolved once
   and reused across the buyer, seller, and admin emails. Order/product IDs are retained.
   _Files: `backend/src/services/email.js`, `backend/src/services/paymentSuccess.js`_

5. **Email links hardened for production**
   The `BASE_URL` used for email buttons now handles a comma-separated `FRONTEND_URL` (taking
   the first usable origin) and, in production, **never uses a localhost origin** — it falls
   back to `https://www.hilgod.com`. This prevents a misconfigured env from sending customers
   email buttons that point at localhost. No email link is hardcoded to localhost.
   _File: `backend/src/services/email.js`_
   _Note: ensure the production backend's `FRONTEND_URL` is set to `https://www.hilgod.com`;
   the local `.env` value of `http://localhost:3000` is correct for development only._

_All changes verified with `node --check`, a full app-load smoke test, and a render test of
the order emails under a production env; the frontend build and backend syntax checks pass._

---

## Open items (recommended, not yet done)

### Action required (client side)
- ~~Run the 3 pending migrations~~ **Done (2026-06-09).** Migrations `009_seller_bank_details`,
  `010_platform_settings`, and `011_campaigns` are confirmed applied on the live database:
  profile bank columns exist, `platform_settings` is seeded (`auto_approve_products=false`),
  and `flash_sales` carries the `type`/`title`/`theme` campaign columns. Payout bank-detail
  saving, the auto-approve toggle, and the Black Friday / Easter pages are now fully active.

### Recommended improvements (to plan)
- **Row-Level Security (defense-in-depth).** The backend uses the Supabase service-role
  key, which bypasses RLS — so all data protection currently lives in application code.
  This is implemented well, but enabling RLS would add a database-level safety net.
- **Serverless-aware rate limiting.** Limits use an in-memory store, which on Vercel is
  per-instance and resets on cold start, weakening their effect. A shared store
  (e.g. Upstash/Redis) would make them reliable.

### Minor notes
- Inventory timing: an order moving to `processing` counts as a sale on dashboards before
  stock is decremented (withdrawable balance is already correctly excluded). Low impact.
- Cached identity means a banned user keeps access until their token expires (~1h) —
  standard JWT trade-off.

---

## Verification

- Backend: `node --check` on all modified files — pass.
- Backend: full `require('./src/index.js')` app-load — pass.
- Frontend: `npm run build` — compiles successfully.
- Live DB spot-checks confirmed seller/admin sales metrics populate correctly.
