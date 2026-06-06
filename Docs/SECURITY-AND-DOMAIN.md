# Hilgod — Security Test Results, Domain Cutover & Open Gaps
**Last updated:** 2026-06-05

---

## 1. `api.hilgod.com` custom domain

### Status: LIVE and serving the backend ✅
Verified at Vercel's edge (correct SNI + TLS cert) — `GET https://api.hilgod.com/api/health` → **HTTP 200**.

- DNS: `api.hilgod.com` → CNAME `a99e00ed8adeaef8.vercel-dns-017.com` → Vercel (`216.198.79.1`, `64.29.17.1`) — the correct per-domain target.
- Attached to the **`hilgod-api`** Vercel project.
- TLS cert provisioned; old Supabase `_acme-challenge.api` record removed (no conflict).

### Remaining cutover steps (so the app actually USES it)
Currently the app still calls `hilgod-api-two.vercel.app`. To switch:

1. **Frontend env** — Vercel → `hilgod` (frontend) project → Environment Variables → set BOTH to the new base, then redeploy:
   - `NEXT_PUBLIC_API_URL` = `https://api.hilgod.com/api`
   - `BACKEND_URL` = `https://api.hilgod.com/api`
   - Redeploy frontend: `./deploy.ps1 -FrontendOnly` (or Vercel "Redeploy").
   - *Low risk:* Next.js proxies `/api` server-side, so the browser still calls `www.hilgod.com/api` — no CORS change, only where the proxy points.

2. **Paystack webhook** — Paystack Dashboard → Settings → API Keys & Webhooks → set webhook URL:
   - `https://api.hilgod.com/api/payment/webhook` (event `charge.success`).

3. **(Optional) Stripe webhook** — if used, point it at `https://api.hilgod.com/api/stripe/webhook` and keep `STRIPE_WEBHOOK_SECRET` in sync.

### Verify after cutover
- Visit `https://api.hilgod.com/api/health` → `{status:"success"}`.
- Place a test order → confirm it reaches `paid` (webhook now hitting api.hilgod.com).
- Browse storefront → products/categories still load (frontend proxy points to new base).
- No need to change backend CORS: it allows `FRONTEND_URL` (the browser origin `www.hilgod.com`), which is unchanged.

### Rollback
Revert the two frontend env vars to `https://hilgod-api-two.vercel.app/api` and redeploy; revert the Paystack webhook URL. `api.hilgod.com` can stay attached harmlessly.

---

## 2. Vulnerability / security test results

Run anytime from `backend/`: `npm test` and `npm run probe`
(probe scripts live in `backend/scripts/*-probe.js`, git-ignored; `PROBE_BASE` overrides target).

### Results — ALL CLEAN (0 flags)
| Test | Coverage | Result |
|---|---|---|
| **Jest** (`npm test`) | products API + resilience lib | 13/13 pass |
| **Injection probe** | SQLi/XSS/edge payloads on search, category, id, limit, page, reviews | 0 flags — no SQLi (Supabase parameterized), no XSS, no DB-error leak |
| **Attack-surface probe** | auth bypass (garbage/forged JWTs), webhook signature bypass, public-write validation, CORS, method tampering | 0 flags — all 401/400 as expected; CORS doesn't reflect forged origin |
| **Robustness probe** | unknown route, content-type confusion, oversized body, huge-limit DoS, unicode/long input, functional smoke | 0 flags |
| **Security headers** | Helmet | CSP, HSTS, X-Content-Type-Options nosniff, X-Frame SAMEORIGIN, Referrer-Policy no-referrer; no `X-Powered-By` |

### Hardening applied from these tests (committed + deployed)
- `isUuid()` guards on `/products/:id`, `/reviews/:productId`, `/orders/:id` — malformed ids now 404 instead of a 500 leaking Postgres `22P02` (`e67337c`, `lib/validate.js`).
- Global **5xx error scrubbing** in production — no raw DB/stack/HTML to clients (`e67337c`).
- Public **`/products` limit capped at 100** — was unbounded (could pull the whole catalog) (`98e943b`).
- **JSON 404** for unknown routes (was Express HTML page) + **`req.body` guard** so non-JSON/bodyless POSTs validate→400 instead of crash→500 (`c3e487d`).
- npm probe scripts added (`480cfac`); probe scripts git-ignored (`74a4e1f`).

### Pre-existing protections confirmed
- All `/api/admin/*` and `/api/seller/*` enforce role checks; user data scoped by `req.user.id` (no IDOR in code review).
- Webhooks (Paystack/Stripe) HMAC/signature-verified + idempotent via `payment_events`.
- JWT verified locally via Supabase JWKS; anon key returns 0 rows on sensitive tables (RLS).

---

## 3. What's missing / still to do

### Security
- **Authenticated IDOR test — NOT YET DONE (the one real gap).** All probes were unauthenticated. Cross-user access (customer A reading/modifying customer B's orders/cart/wishlist; seller reading another seller's payouts/earnings) is untested live. Needs **two test logins**; then write `backend/scripts/idor-probe.js`. Code review suggests it's safe (queries scoped by `req.user.id`) but it must be verified.
- **Rate limits** were not exhausted in testing (to avoid locking real users). Limits exist (payment 10/hr, general 500/15min, password/review/upload/write limiters); a controlled load test could confirm thresholds.

### Operational / config
- **Frontend cutover to `api.hilgod.com`** (section 1) — not done; app still on `hilgod-api-two.vercel.app`.
- **Paystack webhook URL** — update if/when cutting over.
- **Supabase Realtime** — enable replication on `orders` + `order_items` so the admin/seller/account live-refresh works (30s poll is the fallback today).
- **`BANK_ACCOUNT_NUMBER` / `SUPPORT_PHONE`** — confirm real values are set in backend env (were placeholders earlier).

### Product / UX (deferred, noted)
- **Ladies → real subcategory of Womenswear** — currently a nav alias linking to womenswear; make it a true subcategory + tag products later.
- **UI/responsiveness polish** — earlier audit found minor items (sub-44px touch targets, a few cramped grid bands, scroll-fade affordance for the now-hidden scrollbars); deferred by request.

### Payout system (future)
- No platform commission deduction (sellers get 100% of item revenue).
- Refunded/returned orders aren't deducted from seller earnings.
- Disbursement is manual (no automated Paystack Transfer).
