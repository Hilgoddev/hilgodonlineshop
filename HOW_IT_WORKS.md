# Hilgod Online Shop — How It Works

A functional walkthrough of the **entire platform** — every major feature, what it does, and
the mechanism behind it. Written for both the client and any developer taking over the project.

## Architecture at a glance

- **Frontend** (`frontend/`) — Next.js (React). Server-rendered pages + a REST client that
  talks to the backend. Deployed as a web app.
- **Backend** (`backend/`) — Express API. All business logic, validation, payments, and
  email live here. Deployed as serverless functions.
- **Database & Auth** — Supabase (Postgres + GoTrue auth). The backend talks to Postgres
  with the service-role key; users authenticate against Supabase Auth.
- **Payments** — Paystack and Stripe.
- **Email** — Resend (transactional email).

Request flow: **Browser → Next.js → Express API → Supabase / Paystack / Stripe / Resend.**

---

## 1. Authentication & roles

**What works:** Sign-up, login (email + Google), session persistence, and three roles —
`customer`, `seller`, `admin`.

**How:** Supabase Auth issues a signed JWT on login. The backend verifies that JWT locally
against Supabase's public keys (JWKS) on every request — fast, no per-request network call —
and falls back to a network check if needed. The user's **app role is always read from the
`profiles` table**, never trusted from the token, so permissions can't be forged. Route
guards (`requireAdmin`, `requireSeller`) enforce this server-side; the frontend `AdminGuard`/
`SellerGuard` mirror it for UX by resolving the role from `/api/auth/me`.

## 2. Product catalog & browsing

**What works:** Public product listing with category/subcategory filters, search, sorting,
in-stock and on-sale filters, pagination, and product detail pages.

**How:** `GET /api/products` builds a filtered Supabase query and only ever returns products
that are `is_active = true` **and** `status = 'approved'`. Each product links to a seller and
(optionally) a store. Categories come from a `categories` table with a sensible fallback list.

## 3. Shopping — cart & wishlist

**What works:** Add/remove/update cart items and wishlist items, persisted per user.

**How:** `cart_items` and `wishlist` rows are always scoped to the logged-in user
(`user_id = req.user.id`), so one user can never see or change another's cart.

## 4. Checkout & payments

**What works:** Checkout with Paystack (cards/transfer) or Stripe, an optional third provider
(Grey), plus pay-on-delivery. Prices and totals are tamper-proof.

**How:**
1. **Order creation** (`POST /api/orders`) recomputes every line price **on the server** from
   the database (and any active campaign price) — the client's prices are only used as a
   tamper signal and rejected on mismatch. Delivery fee is added server-side (₦1,500, free
   above ₦50,000). The order saves with status `pending` (or `processing` later).
2. **Payment init** creates a Paystack transaction or Stripe PaymentIntent for the order's
   server-side amount, tied to the order and user.
3. **Confirmation** happens via **webhooks**: Paystack's signature is verified with
   HMAC-SHA512 (timing-safe), Stripe's via `constructEvent`, and Grey's via HMAC-SHA256. Each
   webhook re-checks the paid amount against the order total, then flips the order to `paid`
   using an **atomic claim** (only the first caller wins) so the after-effects run exactly
   once. A `payment_events` table provides an idempotency barrier against duplicate events.
   (Grey is wired and secured the same way but stays disabled until its API key is set.)
4. **After payment:** stock is decremented atomically via a Postgres function
   (`decrement_product_stock`, never goes negative), the cart is cleared, and confirmation
   emails are sent.

Stock is intentionally decremented **only on payment** (reserve-on-pay), so abandoned
checkouts don't lock inventory.

## 5. Order lifecycle

**What works:** Orders move through `pending → processing → shipped → delivered`
(or `cancelled`), with per-item fulfilment tracking.

**How — what each status means:**
- `pending` — order placed, awaiting payment.
- `processing` — payment received, being prepared for dispatch.
- `shipped` / `delivered` — in transit / completed.
- `cancelled` — voided (reserved stock is restored).

For sales reporting, `paid`, `processing`, `shipped`, and `delivered` all count as real sales.

## 6. Seller features

**What works:** Sellers apply to sell, create a store, upload products, see a dashboard of
their sales, manage customer orders, and request payouts.

**How:**
- **Store & products** — a seller owns one store; products they create are tied to their
  `seller_id`. They can only edit/delete their own products and store (ownership enforced).
- **Dashboard metrics** — computed live from the seller's order items in revenue-status
  orders: **Sales** = number of distinct orders, **Units Sold** = total quantity,
  **Revenue** = sum of (price × quantity).
- **Payouts (manual)** — the seller's available balance = lifetime earnings minus amounts
  already approved/paid. Earnings for **withdrawal** exclude `processing` (cash not yet in
  hand), even though those still show as sales activity. On a payout request the seller's
  bank details are saved to their profile and pre-filled next time. An admin reviews and
  approves each request.

## 7. Admin features

**What works:** A full admin console — analytics, customers, sellers, stores, product
approvals, orders, payouts, returns, riders, and platform settings.

**How:**
- **Analytics** (`/api/admin/stats`) — platform totals: revenue, orders, **units sold**,
  customers, sellers, products, orders-by-status, a 6-month revenue trend, recent orders, and
  low-stock alerts.
- **Sellers/Stores tables** — each row shows the seller's/store's number of sales, units, and
  revenue, computed the same way as the seller dashboard.
- **Product approval** — sellers' products start `pending` and an admin approves/rejects them.
  A **global "auto-approve" toggle** (stored in `platform_settings`) can make seller uploads
  go live immediately instead.
- **Payouts** — admins see all requests with bank details and approve/reject them.

## 8. Promotions — Flash Sales, Black Friday, Easter

**What works:** Timed product discounts grouped under a campaign type (flash / black_friday /
easter). Each type has its own storefront page **and** its own section + hero slide on the
landing page. Admins manage all of them from one screen.

**How:**
- **Data** — a single `flash_sales`/campaigns table holds each discounted product, its sale
  price, an expiry, and a `type`. An admin creates campaigns from Admin → Flash Sales: the
  **Add** button and header adapt to the selected type (Add Flash Sale / Black Friday / Easter),
  a hint shows which page it will appear on, and the **All Campaigns** table lists every
  campaign with a **Type** badge.
- **Storefront pages** — `/flash-sales`, `/black-friday`, and `/easter` each fetch
  `/api/campaigns?type=…` and render only that type (with a live countdown).
- **Landing page** — fetches all active campaigns and renders **one section per active type**
  (skipping types with none), plus **one hero slide per active type**, each linking to its page.
- **Checkout** — the order pricing engine looks up any **active, unexpired campaign** for each
  product and uses the sale price automatically, so discounts apply at the source of truth
  (the server), not the client — regardless of campaign type.

## 9. Email notifications

**What works:** Order confirmation (buyer), payment confirmed, new-order alerts (seller &
admin), seller approval, returns, newsletter, and application acknowledgements.

**How:** Sent via Resend from `order@hilgod.com`. Buyer-facing details use the **customer's
name and the order date** (not internal IDs). All links in emails are built from a base URL
that, in production, always points to the live domain (never localhost). All user-supplied
text is HTML-escaped.

## 10. Currency

**What works:** Prices display in the user's currency.

**How:** Exchange rates are fetched from an external source and cached, with a safe fallback
if the source is unavailable. All orders are recorded in NGN; display conversion happens for
presentation.

## 11. Other working flows

- **Reviews** — one review per user per product; the reviewer's identity comes from their
  verified account, so reviews can't be spoofed.
- **Returns** — a return can only be filed against the requester's own order, with an email
  match check.
- **Public store pages** — `/stores/[slug]` shows a store and its approved products.
- **Image uploads** — sellers/admins upload product images (`POST /api/upload/product-image`);
  files are validated by type and size (max 5 MB, image formats only), stored in a Supabase
  Storage bucket under the uploader's ID, and served via public URLs.
- **Newsletter, delivery-rider, and career applications** — captured to the database and
  acknowledged by email, all rate-limited against spam.

---

## Resilience & safety built in

- Server-side price recomputation and webhook amount checks prevent payment tampering.
- Idempotency + atomic claims make payment side-effects exactly-once.
- Per-user scoping and DB-backed role checks prevent cross-account access.
- Rate limiting, `helmet`, a CORS allowlist, HTML escaping, and production error masking
  harden the API. Missing critical secrets cause a hard startup failure in production.

For a security/quality assessment and the end-to-end test evidence, see `AUDIT_REPORT.md`.
For setup and deployment, see `HANDOVER.md`. For end-to-end flows, see `Docs/SYSTEM-FLOWS.md`.

---

## Recent additions (2026-06)

- **Deals hub (`/deals`)** — one page aggregating every discounted product (active campaigns
  OR `original_price > price`); the navbar "Deals" link points here. The `on_sale` product
  filter is now functional.
- **Store navigation & contact** — store names link to `/stores/[slug]` from product cards and
  the product page; the store page shows seller details and a **WhatsApp "Contact Seller"**
  button (the product page has one too). Store names are unique.
- **10% platform commission** — sellers net 90% of each sale; admin analytics shows commission +
  product sales; the payouts page breaks it down. Payout requests email the seller's bank details
  to `contact@hilgod.com`.
- **Variants** — size/color flow product page → Quick View (selection carried via URL) → cart →
  order; shown in cart, checkout, and all order views; colors render as names.
- **Order emails** carry product + customer names with the order ID.

## Future updates (intentionally deferred — not bugs)
- **Standalone `/reviews` page** is built but unlinked (footer badge + "Read All Reviews"
  commented out). Uncomment to launch.
- **Coupon / promo-code system** — the cart promo block is commented out; no backend coupon model yet.
- **Server-side cart variant options** — selected size/color are held per-browser (localStorage),
  not synced across devices before checkout.
- **Supabase vanity auth domain** (e.g. `auth.hilgod.com`) not configured — auth links use the
  default `…supabase.co`. See `AUTH_AND_OAUTH_SETUP.md`.
