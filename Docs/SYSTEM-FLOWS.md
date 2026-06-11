# Hilgod Online Store — System Flows & How Everything Works
**Last updated:** 2026-06-11

A multi-vendor, multi-currency e-commerce platform.
- **Frontend:** Next.js (Pages Router), React, deployed on Vercel (`hilgod.com` / `www.hilgod.com`)
- **Backend:** Express API on Vercel serverless (`api.hilgod.com` — live, verified)
- **Database/Auth/Storage:** Supabase (PostgreSQL + GoTrue auth + Storage)
- **Payments:** Paystack (primary, NGN), Stripe (secondary), Bank transfer, Pay on Delivery
- **Email:** Resend

> **Key principle:** the backend talks to Supabase with the **service-role key**, so
> Row-Level Security is bypassed server-side. **All access control lives in the Express
> route middleware** (`verifyToken`, admin/seller role checks, and `req.user.id` scoping).
> The frontend uses the **anon key** only for login + realtime subscriptions.

---

## 1. Authentication
1. User signs up / logs in on the frontend via Supabase Auth (email/password or Google OAuth).
2. Supabase issues a JWT (ES256, signed by Supabase's private key).
3. Every API call sends `Authorization: Bearer <token>` (see `frontend/lib/apiClient.js`).
4. Backend `verifyToken` (`backend/src/routes/auth.js`):
   - Decodes the JWT header, fetches Supabase's **public JWKS** (cached 10 min), and verifies
     the signature **locally** — no network call per request (fast).
   - Falls back to a network `getUser()` only if local verification can't run.
   - Sets `req.user = { id, email, ... }`.
5. `sync-profile` upserts a row in `profiles` (id, username, full_name, role). Roles: `customer`,
   `seller`, `admin`.
6. **Password change** (`PUT /api/user/password`): requires the **current password**, verified
   against GoTrue before the new one is set. Rate-limited.

---

## 2. Product lifecycle
1. **Seller creates** a product → `POST /api/products` (seller/admin only).
   - Seller-created products start `status = 'pending'`; admin-created start `approved`.
   - `seller_id` is always forced to `req.user.id` (a seller can't create for someone else).
2. **Admin approves/rejects** → `PATCH /api/products/:id/status` (admin only) → `approved` | `rejected`.
3. **Public listing** (`GET /api/products`): shows only `is_active = true` AND `status = 'approved'`.
   Supports `category`, `subcategory`, `search`, `sort` (price/newest), `in_stock`, pagination.
   Cached 60 s with stale-while-revalidate + single-flight coalescing.
4. **Product detail** (`GET /api/products/:id`): also enforces `is_active + approved` (404 otherwise),
   so hidden products can't be opened by direct URL. **Consistent with the listing and checkout.**
5. **Out of stock** (`stock = 0`): still listed, but the card is dimmed with an "OUT OF STOCK"
   overlay and the Add-to-Cart button is disabled (`frontend/components/ProductCard.js`).

---

## 3. Browsing & multi-currency display
- Product **prices are stored in NGN** (the base currency).
- `CurrencyContext` detects the visitor's currency (server geo header → `ipwho.is` fallback →
  timezone/locale → USD) and converts **for display only** using exchange rates from
  `GET /api/exchange-rates` (Supabase `exchange_rates` table, with hardcoded fallback rates).
- `formatPrice(amount, sourceCurrency, compact)` converts NGN→display; it guards against
  zero/invalid rates so it never shows `NaN`/`Infinity`.
- **Crucial:** conversion is cosmetic. `normalizePricing` always returns the **raw NGN** price,
  and that NGN value is what's sent to the server and charged. The displayed currency never
  leaks into the amount.

---

## 4. Cart & wishlist
- Both are per-user, scoped by `req.user.id` (no cross-user access).
- **Cart** (`/api/cart`): GET/POST/PUT/DELETE + `/clear`. Quantity is strictly parsed
  (positive integer, clamped 1–99; rejects `NaN`/garbage). `productId` required.
- **Wishlist** (`/api/wishlist`): GET/POST/DELETE.
- Cart/wishlist prices are recomputed live (including any active flash-sale price) on read.

---

## 5. Checkout & order creation
File: `frontend/pages/checkout.js` → `POST /api/orders`.
1. Customer fills shipping details, picks a payment method (Paystack / Stripe / Bank transfer / POD).
2. Frontend sends cart items with their NGN prices + shipping address + payment method.
3. **Server recomputes everything from the DB** (`backend/src/routes/orders.js`):
   - Validates each product is `active + approved` and in stock.
   - Recomputes unit price server-side (flash-sale price if an **active, non-expired** sale exists).
   - **Rejects price tampering** (client price must match server price).
   - Adds delivery fee server-side (free above ₦50,000, else ₦1,500).
   - Inserts the `orders` row (status `pending` for all methods, including POD — cash is
     collected at delivery, not upfront) + `order_items` (each with `seller_id` for vendor attribution).
4. A confirmation email is sent (fire-and-forget).
5. **Stock is NOT decremented at order creation** — it's reserved-on-pay (decremented only after
   payment success), so abandoned orders don't lock inventory.

---

## 6. Payment flows

### Paystack (primary)
1. `POST /api/payment/initiate` (auth + rate-limited): fetches the order (server amount),
   sanitizes the payer email, calls Paystack `transaction.initialize`, returns an `authorization_url`.
2. Customer pays on Paystack, then is redirected back to `/checkout?reference=…`.
3. **Two independent confirmation paths** (either one confirms the order, exactly once):
   - **Webhook** `POST /api/payment/webhook` — Paystack calls this server-to-server. HMAC-SHA512
     verified; idempotent via the `payment_events` table.
   - **Redirect verify** `GET /api/payment/verify/:reference` — the checkout page calls this on
     return; it asks Paystack to verify the transaction.
4. Both use an **atomic claim** (`update … where status != 'paid'`) so only the first to flip the
   order to `paid` runs post-payment processing → **no double stock decrement**.

### Stripe (secondary)
- `POST /api/stripe/create-payment-intent` → returns a `clientSecret`; the Stripe PaymentElement
  renders on `/checkout`. Charges in the order's currency (NGN). `POST /api/stripe/webhook`
  confirms (signature-verified, idempotent), same post-payment processing.

### Bank transfer / Pay on Delivery
- No online charge. Order is created (`pending`). An **admin marks it paid later** (see §7),
  which triggers the same post-payment processing. POD orders go `pending → processing →
  shipped → delivered`; cash is collected at delivery so there is no separate `paid` step for POD.

### Post-payment processing — `backend/src/services/paymentSuccess.js`
Runs **once** per order when it becomes paid (from any path above):
1. Decrements product stock atomically (`decrement_product_stock` RPC, never goes negative).
2. Emails the **buyer** (payment confirmed), each **seller** (new order for their items), and the
   **admin** (new paid order).
> Historical bug (fixed): this function read a non-existent `price` column and silently aborted,
> so stock/emails never ran. It now reads `unit_price`.

---

## 7. Order status & fulfillment
- **Customer** sees their orders at `/account?tab=orders` (expandable, with live status updates).
- **Admin** (`/admin/orders`): inline status dropdown (pending → paid → processing → shipped →
  delivered / cancelled). For **POD orders** the `paid` option is hidden (cash is collected at
  delivery; the delivered step serves as the paid point). Changing status:
  - Saves via `PUT /api/orders/:id` (admin only).
  - On the **first transition into a paid state** (paid/shipped/delivered) it runs the
    post-payment processing once (decrements stock + notifies sellers) — this is how
    bank-transfer/POD orders get fulfilled.
  - **Cascades to items:** the order's `order_items.fulfillment_status` is updated to match
    (processing→packed, shipped/delivered/cancelled 1:1), so the admin/seller/customer views
    never show "Item status: pending" on a shipped order.
  - Sends the customer a status-update email, and can also open a **compose-email modal** with
    per-status templates (`POST /api/orders/:id/notify`).
  - The dashboard's recent-orders and the orders page derive payment status identically
    (shipped/delivered ⇒ paid for online; delivered-only ⇒ paid for POD) so every view agrees.
  - Status labels are POD-aware everywhere (account, seller orders, admin, track-order, emails)
    via `orderStatusLabel(status, paymentMethod)`. POD shows "Order placed / Preparing / Out
    for delivery / Delivered & paid" — never "Awaiting payment" or "Paid · Preparing".
- **Seller** (`/seller/orders`): sees only order items for their own products; can update each
  item's `fulfillment_status`. Cancelling a paid item restores its stock.

---

## 8. Reviews
- `GET /api/reviews/:productId` — public list (canonical `reviews` table).
- `POST /api/reviews` — logged-in users: rating must be an **integer 1–5**, **one review per
  user per product** (409 on duplicate), length-capped, rate-limited. (No purchase requirement.)

---

## 9. Returns
- `POST /api/returns` — customer requests a return for an order they own (ownership + email
  verified, rate-limited). Emails admin + customer.
- Admin manages via `GET/PATCH /api/returns/:id`. Moving a return to `approved`/`refunded`
  restores stock for the order's items (once).

---

## 10. Seller dashboard, analytics & earnings
- `GET /api/seller/dashboard` — product count + **sales totals from PAID orders only**.
- `GET /api/seller/analytics` — per-product sales/units (paid orders only), status breakdown.
- `GET /api/seller/orders` — orders containing the seller's items.
> Earnings count **only** `paid`/`shipped`/`delivered` orders — unpaid/pending/cancelled never
> inflate a seller's numbers (payout integrity).

---

## 11. Payout flow (seller withdrawals)
**Manual ledger — the platform tracks balances; an admin disburses money by hand.**

1. **Earnings calculated live** — `GET /api/seller/earnings`:
   ```
   grossEarnings = Σ(unit_price × quantity) of the seller's order_items
                   WHERE order status ∈ {paid, shipped, delivered}
   withdrawn     = Σ amount of this seller's payouts with status ∈ {approved, paid}
   available     = max(0, grossEarnings − withdrawn)
   ```
   (Delivery fees are excluded — sellers aren't paid the delivery charge.)
2. **Seller requests** — `POST /api/seller/payouts/request` `{ amount, payment_method,
   payment_details }`: re-checks `available` server-side; inserts a `seller_payouts` row with
   status `pending`.
3. **Admin processes** — `GET /api/admin/payouts` lists requests; `PUT /api/admin/payouts/:id`
   sets `approved` | `paid` | `rejected` (records `processed_by`, `processed_at`, notes).
   - `approved`/`paid` count against the seller's balance.
   - The admin sends the actual money **off-platform** (bank transfer using `payment_details`)
     and marks it `paid`. **There is no automated bank/Paystack transfer.**

> **Known gaps:** refunded/returned orders aren't automatically deducted from earnings (admin
> adjusts manually); the balance check isn't fully race-proof under very high concurrency;
> disbursement is manual (admin sends money off-platform, then marks it `paid`).

---

## 12. Admin dashboard & analytics
- `GET /api/admin/stats` powers `/admin` and `/admin/analytics`:
  - Revenue (all paid/delivered orders), total orders, products, pending approvals.
  - User breakdown: total registered / customers / sellers / admins.
  - Store breakdown: approved / pending.
  - Orders-by-status (all-time), 6-month revenue trend, recent orders, low-stock list.
  - Cached 30 s; busted on order status change.
- Other admin areas: products, orders, customers, sellers, stores, categories, riders,
  flash-sales, approvals, payouts. All admin-gated.

---

## 13. Real-time updates
- Admin/seller/customer order pages subscribe to Supabase realtime (`postgres_changes` on
  `orders`/`order_items`) using the anon key, with a 30 s poll fallback. Requires Realtime to
  be enabled for those tables in the Supabase dashboard; the poll covers it otherwise.

---

## 14. Security & rate limiting
- **Auth:** local JWKS verification; per-route `verifyToken`; admin/seller checks; `req.user.id`
  scoping everywhere (no IDOR).
- **Webhooks:** HMAC/signature verified + idempotent (`payment_events`).
- **Server-authoritative money:** prices, totals, stock, and currency are all recomputed/validated
  server-side; client values are never trusted.
- **Rate limits** (`backend/src/middleware/rateLimit.js`): general API; stricter on payment init,
  password change, reviews, uploads, returns, seller-apply, careers, newsletter, delivery.
- **Env hygiene:** all secrets cleaned of BOM/zero-width chars (`cleanEnv`) before use in headers.
- **Uploads:** authenticated, MIME-whitelisted, 5 MB cap, stored per-user in Supabase Storage.

---

## 15. Data model (key tables)
- `profiles` — user id, role, full_name, phone.
- `products` — price (NGN), stock, status, is_active, seller_id, images, category.
- `stores` — owner_id, name, slug, status, logo.
- `orders` — user_id, total_amount (NGN), currency, status, shipping_address, payment_reference.
- `order_items` — order_id, product_id, seller_id, quantity, **unit_price**, fulfillment_status.
- `payment_events` — webhook idempotency ledger.
- `seller_payouts` — seller_id, amount, status, payment_method, payment_details.
- `reviews` — product_id, user, rating, title, message (canonical; `product_reviews` deprecated).
- `flash_sales`, `return_requests`, `rider_applications`, `seller_applications`,
  `exchange_rates`, `cart_items`, `wishlist_items`, `newsletter_subscribers`, `email_logs`.

---

## 16. Deployment
- Two Vercel projects: **frontend** (`hilgod`) and **backend** (`hilgod-api`).
- Deploy via `deploy.ps1` (renames `.git` during deploy to bypass the Hobby plan team block,
  then restores it). Source of truth pushed to the `client` git remote (`Hilgoddev/hilgodonlineshop`).
- **Manual ops still required:** set the Paystack webhook URL to
  `https://<api-domain>/api/payment/webhook` (event `charge.success`); point `api.hilgod.com`
  at the backend; enable Supabase Realtime on `orders`/`order_items`.

---

## 17. Recent features & flows (2026-06)

### Campaigns & Deals
- One `flash_sales`/campaigns table powers three **types**: `flash`, `black_friday`, `easter`
  (`backend/src/routes/campaigns.js`; legacy `/api/flash-sales` aliases type=flash).
- Storefront pages `/flash-sales`, `/black-friday`, `/easter` (filtered by type) + a unified
  **`/deals`** hub. Homepage renders one section + one hero slide per active type.
- **`on_sale` filter** (`GET /api/products?on_sale=true`): a product is on sale if it's in an
  active campaign OR `original_price > price` (markdown). `/deals` and the products "On Sale"
  filter both use it.
- Order pricing applies the active campaign sale price server-side at checkout (tamper-proof).

### Reviews (project-wide)
- `reviews` table; `GET /api/reviews/:productId`, `/recent`, `/overall` (the last two defined
  BEFORE `/:productId`). Products list/detail are enriched with `rating` + `review_count`.
- Surfaces: star ratings on product cards everywhere, the product page Reviews tab (+ live count),
  a homepage testimonials section, and a footer rating badge. The standalone `/reviews` page is
  built but **intentionally unlinked** (FUTURE UPGRADE).

### Product variants (size/color)
- `order_items.selected_options` (JSONB) stores the chosen size/color. Captured on the product
  page, Quick View (selection carries to the product page via `?size=&color=`), and bulk
  wishlist→cart. Shown in cart, checkout, and all three order views (buyer/seller/admin).
- Colors display as **names** (e.g. "Denim"), not hex, via `frontend/lib/colorName.js`.

### Money: commission, metrics, payouts
- Each sale: seller nets **90%**, platform (admin) takes **10%**. Admin analytics shows
  `revenue` (incl. delivery), `productSales` (excl. delivery), `platformCommission` (10%), `unitsSold`.
- Metric status sets (`backend/src/lib/orderStatus.js`): `REVENUE_STATUSES`
  (`paid,processing,shipped,delivered`) for dashboards; `PAYABLE_STATUSES`
  (`paid,shipped,delivered`, excludes processing) for withdrawable balance.
- **Payouts** are manual: seller requests → bank details saved on the profile + the request,
  shown in admin, and **emailed to `contact@hilgod.com`** (`PAYOUT_NOTIFY_EMAIL`).

### Store/seller & contact
- Store names link to `/stores/[slug]` from product cards and the product page. The store page
  shows seller details + a **WhatsApp "Contact Seller"** button; the product page has a WhatsApp
  contact too (uses `seller.phone_number`). Store names are unique (case-insensitive, enforced).

### Auto-approve & order status
- Global `platform_settings.auto_approve_products` toggle (admin) decides if seller uploads go
  live immediately or wait for approval.
- `pending` = awaiting payment; `processing` = paid & being prepared (POD orders start `pending`).

### Emails
- All order emails (confirmation, payment, status update, seller/admin new-order, returns) include
  **product names + customer name** with the order ID; sent from `order@hilgod.com` via Resend;
  links always resolve to the live domain in production.
