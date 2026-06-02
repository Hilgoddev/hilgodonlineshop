# Hilgod Online Shop — Full Project Audit
> Last updated: 2026-06-02

---

## 1. Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js (Pages Router), React 19, JavaScript |
| Backend | Node.js + Express 5, deployed as Vercel Serverless Functions |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth — email/password + Google OAuth |
| Payments | Paystack (live, working), Stripe (live keys set, gated by feature flag), Grey (stub), Bank Transfer, Pay on Delivery |
| Email | Resend API (live key configured) |
| File Storage | Supabase Storage (`product-images` bucket) |
| Rate Limiting | `express-rate-limit` |
| Caching | In-memory TTL cache + singleFlight coalescing (custom `resilience.js`) |
| Currency detection | Next.js API route reads Vercel geo headers; fallback to USD |
| Exchange rates | `exchange_rates` table in Supabase with 10-min in-memory cache + static fallback |

---

## 2. Environment Configuration (backend `.env`)

| Variable | Status | Notes |
|---|---|---|
| `SUPABASE_URL` | Set | Points to production project |
| `SUPABASE_SERVICE_ROLE_KEY` | Set | Production key |
| `PAYSTACK_SECRET_KEY` | Set | Live key (`sk_live_…`) |
| `STRIPE_SECRET_KEY` | Set | Live key (`sk_live_51…`) |
| `STRIPE_WEBHOOK_SECRET` | Set | Configured |
| `RESEND_API_KEY` | Set | Live key |
| `ADMIN_EMAIL` | Set | `hilgoddev@gmail.com` |
| `FRONTEND_URL` | **`localhost:3000` only** | Must be updated to `https://hilgod.com,https://www.hilgod.com` for production CORS |
| `GREY_API_KEY` | **Placeholder** | Still `your-grey-api-key` — Grey not functional |
| `GREY_WEBHOOK_SECRET` | **Placeholder** | Same |
| `BANK_ACCOUNT_NUMBER` | **Placeholder** | Still `0000000000` — needs real bank info |
| `SUPPORT_PHONE` | **Placeholder** | `+123` — needs real number |
| `LOGO_URL` | Set | `https://www.hilgod.com/logo.png` |
| `EMAIL_FROM_NOREPLY` | Set | `noreply@hilgod.com` |
| `EMAIL_FROM_ORDERS` | Set | `contact@hilgod.com` |
| `EMAIL_VERIFICATION_ENABLED` | `true` | Email confirmation required on signup |

---

## 3. Database Tables

| Table | In schema.sql | Notes |
|---|---|---|
| `profiles` | Yes | Roles: customer / seller / admin |
| `categories` | Yes | Hierarchical (parent_id) |
| `stores` | Yes | Seller storefronts (pending/approved/rejected) |
| `products` | Yes | Status (pending/approved/rejected), stock, seller_id, store_id |
| `product_reviews` | Yes | One review per user per product (UNIQUE constraint) |
| `reviews` | Yes | Separate table used by `/api/reviews` — **overlaps with product_reviews** |
| `orders` | Yes | Status: pending/paid/processing/shipped/delivered/cancelled |
| `order_items` | Yes | Includes `fulfillment_status` (added in migration 20260524) |
| `cart_items` | Yes | Per-user persistent cart |
| `wishlist_items` | Yes | Per-user wishlist |
| `payment_events` | Yes | Idempotency log for webhooks |
| `seller_applications` | Yes | Seller onboarding workflow |
| `flash_sales` | **No — migration only** | Only in migration 001; missing from schema.sql |
| `exchange_rates` | **No — migration only** | Only in migration 002; missing from schema.sql |
| `return_requests` | **Not in schema.sql** | Referenced in backend code but never defined in schema.sql |
| `rider_applications` | **Not in schema.sql** | Referenced in backend code but never defined in schema.sql |
| `newsletter_subscribers` | **Not in schema.sql** | Referenced in backend code but never defined in schema.sql |

---

## 4. Backend API — All Endpoints

### Core / Infra
| Method | Path | Auth | Status |
|---|---|---|---|
| GET | `/api/health` | — | Working |
| GET | `/api/db-test` | — | Working |
| POST | `/api/newsletter/subscribe` | — | Working (rate-limited, DB + email) |
| POST | `/api/delivery/apply` | — | Working (rate-limited, DB + emails to admin + applicant) |

### Auth (`/api/auth`)
| Method | Path | Auth | Status |
|---|---|---|---|
| POST | `/sync-profile` | JWT | Working — upserts profile; called after every login/signup |
| POST | `/auto-confirm` | — | Working (dev only; blocked when `EMAIL_VERIFICATION_ENABLED=true`) |
| GET | `/me` | JWT | Working — returns profile with role; 30s in-memory cache |

### Products (`/api/products`)
| Method | Path | Auth | Status |
|---|---|---|---|
| GET | `/` | — | Working — paginated, filterable, stale-while-revalidate cache |
| GET | `/all` | JWT (admin) | Working — admin list with search |
| GET | `/:id` | — | Working |
| POST | `/` | JWT (seller/admin) | Working — admin-created products auto-approved; seller products start as `pending` |
| PUT | `/:id` | JWT (seller/admin) | Working — seller scoped to own products |
| DELETE | `/:id` | JWT (seller/admin) | Working — FK violation returns 409 (deactivate instead) |
| PATCH | `/:id/status` | JWT (admin) | Working — approve/reject products |

### Orders (`/api/orders`)
| Method | Path | Auth | Status |
|---|---|---|---|
| GET | `/` | JWT | Working — user's own orders with items + seller info |
| POST | `/` | JWT | Working — server-side price validation, anti-tamper, stock check |
| GET | `/all` | JWT (admin) | Working — paginated, cached 30s |
| GET | `/:id` | JWT | Working — owner or admin |
| PUT | `/:id` | JWT (admin) | Working — status update + auto status email |
| POST | `/:id/notify` | JWT (admin) | Working — manual email to customer from admin orders page |

### Payment — Paystack (`/api/payment`)
| Method | Path | Auth | Status |
|---|---|---|---|
| POST | `/initialize` | JWT | Working — live Paystack key configured; 7s order fetch timeout, 6s Paystack timeout |
| POST | `/initiate` | JWT | Working (alias for `/initialize`) |
| POST | `/webhook` | — | Working — HMAC-verified, idempotent via `payment_events`; clears cart + decrements stock on `charge.success` |
| GET | `/bank-details` | — | Working — serves bank info from env; **account number is still placeholder `0000000000`** |

### Payment — Stripe (`/api/stripe`)
| Method | Path | Auth | Status |
|---|---|---|---|
| POST | `/create-payment-intent` | JWT | **Conditionally working** — live key is set; returns 503 if key format fails check. Frontend gated by `NEXT_PUBLIC_STRIPE_ENABLED=true` env var |
| POST | `/webhook` | — | Working — signature-verified |

### Payment — Grey (`/api/grey`)
| Method | Path | Auth | Status |
|---|---|---|---|
| POST | `/create-payment` | JWT | **Not working** — returns 503; `GREY_API_KEY` is still placeholder |
| POST | `/webhook` | — | **Stub** — code exists but never tested |

### User (`/api/user`)
| Method | Path | Auth | Status |
|---|---|---|---|
| GET | `/profile` | JWT | Working |
| PUT | `/profile` | JWT | Working — updates name + avatar |
| PUT | `/password` | JWT | Working — min 8 chars |

### Cart (`/api/cart`)
| Method | Path | Auth | Status |
|---|---|---|---|
| GET | `/` | JWT | Working — flash sale prices reflected |
| POST | `/` | JWT | Working |
| PUT | `/:productId` | JWT | Working |
| DELETE | `/:productId` | JWT | Working |

### Wishlist (`/api/wishlist`)
| Method | Path | Auth | Status |
|---|---|---|---|
| GET | `/` | JWT | Working — flash sale prices reflected |
| POST | `/` | JWT | Working (upsert — no duplicates) |
| DELETE | `/:productId` | JWT | Working |

### Seller (`/api/seller`)
| Method | Path | Auth | Status |
|---|---|---|---|
| POST | `/apply` | JWT | Working — saves to `seller_applications`, updates profile |
| GET | `/application-status` | JWT | Working |
| GET | `/dashboard` | JWT (seller) | Working — products + sales metrics |
| GET | `/analytics` | JWT (seller) | Working — per-product breakdown, status counts |
| GET | `/orders` | JWT (seller) | Working — orders containing seller's products only |
| PATCH | `/order-items/:id/status` | JWT (seller) | Working — fulfillment status (packed/shipped/delivered/cancelled); auto-restores stock on cancel; auto-updates parent order status |

### Admin (`/api/admin`)
| Method | Path | Auth | Status |
|---|---|---|---|
| GET | `/stats` | JWT (admin) | Working — overview stats, recent orders, low stock, pending approval counts; cached 30s |
| GET | `/customers` | JWT (admin) | Working — paginated |
| GET | `/sellers` | JWT (admin) | Working |
| DELETE | `/customers/:id` | JWT (admin) | Working |
| PUT | `/promote` | JWT (admin) | Working — role change |
| GET | `/seller-applications` | JWT (admin) | Working — filterable by status |
| POST | `/approve-seller/:user_id` | JWT (admin) | Working — sets role, sends email |
| POST | `/reject-seller/:user_id` | JWT (admin) | Working — sends email |
| GET | `/riders` | JWT (admin) | Working — filterable by status |
| PUT | `/riders/:id` | JWT (admin) | Working — approve/reject + notes |
| DELETE | `/riders/:id` | JWT (admin) | Working |

### Stores (`/api/stores`)
| Method | Path | Auth | Status |
|---|---|---|---|
| GET | `/` | — | Working — approved stores only |
| GET | `/all` | JWT (admin) | Working — all stores inc. pending |
| GET | `/me` | JWT (seller) | Working — seller's own store |
| GET | `/:slug` | — | Working |
| POST | `/` | JWT (seller) | Working |
| PUT | `/:id` | JWT (seller) | Working |
| PATCH | `/:id/status` | JWT (admin) | Working — approve/reject store |

### Categories (`/api/categories`)
| Method | Path | Auth | Status |
|---|---|---|---|
| GET | `/` | — | Working — cached 5 min; static fallback list if DB fails |
| POST | `/` | JWT (admin) | Working |
| PUT | `/:id` | JWT (admin) | Working |
| DELETE | `/:id` | JWT (admin) | Working |

### Flash Sales (`/api/flash-sales`)
| Method | Path | Auth | Status |
|---|---|---|---|
| GET | `/` | — | Working — active non-expired only |
| GET | `/all` | JWT (admin) | Working — all including expired |
| POST | `/` | JWT (admin) | Working |
| PUT | `/:id` | JWT (admin) | Working |
| DELETE | `/:id` | JWT (admin) | Working |

### Reviews (`/api/reviews`)
| Method | Path | Auth | Status |
|---|---|---|---|
| GET | `/:productId` | — | Working — reads from `reviews` table |
| POST | `/` | JWT | Working — name/email from verified profile |

### Returns (`/api/returns`)
| Method | Path | Auth | Status |
|---|---|---|---|
| POST | `/` | JWT | Working — verifies order ownership + email; saves to `return_requests`; emails admin + customer |
| GET | `/` | JWT (admin) | Working |
| PATCH | `/:id` | JWT (admin) | Working |

### Misc
| Method | Path | Status |
|---|---|---|
| GET | `/api/exchange-rates` | Working — 10-min cache; static fallback |
| POST | `/api/upload/product-image` | Working — 5 MB limit; Supabase Storage |

---

## 5. Frontend Pages

### Public / Marketing
| Page | Route | Status |
|---|---|---|
| Homepage | `/` | Working — hero slider, category grid, flash sales section, bestsellers, section rows per category |
| About | `/about` | Working — static content |
| Blog | `/blog` | **Static only** — posts are hardcoded with "Coming Soon" badges; no CMS |
| Careers | `/careers` | Working — static job listings, links to email CV |
| Delivery | `/delivery` | Working — delivery partner application form (calls `/api/delivery/apply`) |
| Privacy Policy | `/privacy` | Working — static |
| Terms | `/terms` | Working — static |
| Flash Sales | `/flash-sales` | Working — live data from `/api/flash-sales`, countdown timers, product cards |
| Track Order | `/track-order` | **Redirects to `/account?tab=orders`** — old page removed, redirect in place |

### Catalog
| Page | Route | Status |
|---|---|---|
| Product Listing | `/products` | Working — filters, pagination, category |
| Product Detail | `/products/[id]` | Working — images, add to cart, buy now, wishlist, review form |
| Category Listing | `/categories` | Working |

### User
| Page | Route | Status |
|---|---|---|
| Account | `/account` | Working — profile edit, password change, orders list with expandable detail, wishlist; auto-redirects admin/seller to their dashboards |
| Cart | `/cart` | Working — persistent DB cart, flash sale prices |
| Checkout | `/checkout` | Working — Paystack, Stripe (if enabled), Bank Transfer, Pay on Delivery; anti-tamper price validation |
| Wishlist | `/wishlist` | Working |
| Return Request | `/return-request` | Working — calls `/api/returns`; requires auth; verifies order ownership |

### Auth
| Page | Route | Status |
|---|---|---|
| Login | `/auth/login` | Working — email/password + Google OAuth; role-based redirect after login |
| Signup | `/auth/signup` | Working — email verification modal shown; form data persisted in localStorage across verification round-trip |
| Forgot Password | `/auth/forgot-password` | Working — Supabase sends reset email |
| Reset Password | `/auth/reset-password` | Working |
| OAuth Callback | `/auth/callback` | Working — handles Supabase OAuth redirect |

### Seller Portal (requires `seller` or `admin` role)
| Page | Route | Status |
|---|---|---|
| Seller Zone (apply) | `/seller-zone` | Working — application form; shows status if already applied; localStorage persistence for form data |
| Dashboard | `/seller/dashboard` | Working — product count, total sales, total units, product list |
| Products | `/seller/products` | Working — CRUD; image upload to Supabase Storage; up to 3 images |
| Orders | `/seller/orders` | Working — seller's orders only; fulfillment status control per item; real-time via Supabase subscription |
| Analytics | `/seller/analytics` | Working — per-product sales breakdown, status distribution chart |
| Store Settings | `/seller/store` | Working — create/edit store (name, slug, description) |

### Admin Panel (requires `admin` role)
| Page | Route | Status |
|---|---|---|
| Dashboard | `/admin` | Working — stats, revenue, recent orders, low stock, pending approvals |
| Products | `/admin/products` | Working — full CRUD, approve/reject, image upload, search |
| Orders | `/admin/orders` | Working — list with filters, status update, order details modal, manual email compose to customer, real-time updates via Supabase |
| Customers | `/admin/customers` | Working — list, role change, delete |
| Sellers | `/admin/sellers` | Working — list, demote to customer |
| Stores | `/admin/stores` | Working — list, approve/reject |
| Categories | `/admin/categories` | Working — create, update, delete |
| Flash Sales | `/admin/flash-sales` | Working — create with product picker modal, set timer, edit, delete |
| Approvals | `/admin/approvals` | Working — aggregates pending stores, pending products, pending seller apps in one view |
| Analytics | `/admin/analytics` | **Partially working** — page exists and loads, but it calls `/api/admin/stats` (not a dedicated analytics endpoint). Shows order status breakdown from the 10 most recent orders only — not a full analytics dataset |
| Riders | `/admin/riders` | Working — list, filter by status, approve/reject with notes, delete |

### Dev / Test
| Page | Route | Status |
|---|---|---|
| System Test | `/system-test` | Working — DB and API connectivity test page |

---

## 6. Features: What Is Working

- **Full auth flow** — Supabase email/password + Google OAuth; email verification enforced in production; JWT verified locally via JWKS cache (no GoTrue per request); auth token cached 5 min to avoid GoTrue latency
- **Role-based access** — customer / seller / admin enforced on all protected routes; auto-redirect on login
- **Product catalog** — listing, search, category filter, pagination, store info, flash sale pricing applied server-side; stale-while-revalidate caching
- **Cart** — DB-persisted per user; flash sale pricing reflected; add/update/remove
- **Wishlist** — DB-persisted per user
- **Checkout** — multi-step; Paystack fully wired end-to-end (live key)
- **Paystack payments** — initialize → redirect → webhook (HMAC-verified, idempotent); stock decremented and cart cleared on `charge.success`; payment confirmation email sent
- **Order creation** — server-side price validation (anti-tamper); delivery fee logic (free over ₦50,000); stock availability check; email confirmation sent immediately
- **Post-payment actions** — stock decremented atomically via Postgres RPC; payment confirmation email to buyer; new order notification to each seller; admin alert email
- **Stock management** — never goes negative (DB constraint + RPC guard); restored on item cancellation if order was paid; checked again at order creation
- **Order management (admin)** — view all, update status, manual customer email with templates
- **Order management (seller)** — view own orders, update per-item fulfillment status (packed/shipped/delivered/cancelled); parent order status auto-synced
- **Real-time order updates** — admin and seller orders pages subscribe to Supabase Postgres changes; 30s fallback poll
- **Flash sales** — admin creates sale with product picker and timer; sale price applied server-side to products, cart, and wishlist; countdown timers on frontend; expired sales excluded
- **Admin dashboard** — stats, revenue, recent orders, low stock alerts, pending approval counts
- **Admin approvals** — unified view of pending products, stores, and seller applications
- **Seller application workflow** — user applies → admin reviews → approval email sent → role set to `seller`
- **Seller portal** — dashboard, analytics, product CRUD with image upload, order + fulfillment management, store settings
- **Return requests** — authenticated; verifies order ownership + email match; emails admin and customer
- **Product reviews** — authenticated; name/email from verified profile; stored in `reviews` table
- **Categories** — dynamic taxonomy from DB; 5-min cache; static fallback list if DB is unavailable
- **Stores** — public listing; seller can create/edit own store; admin approve/reject
- **Multi-currency display** — exchange rates from DB; Vercel geo-header detection for auto-currency; static fallback rates
- **Newsletter subscription** — rate-limited; upsert (no duplicates); confirmation email to subscriber + alert to admin
- **Delivery partner applications** — saved to `rider_applications`; emails admin and applicant; rider management in admin panel
- **Image upload** — Supabase Storage; 5 MB limit; JPEG/PNG/WebP/GIF; seller products page + admin products page
- **Transactional emails** — order confirmation, payment confirmed, order status update, new order (seller), new order (admin), seller approved/rejected, rider approved/rejected, newsletter confirmation
- **Rate limiting** — general (500/15 min), admin (300/15 min), payment (10/hr), newsletter (5/hr), delivery (3/hr)
- **Security** — Helmet headers; CORS restricted to `FRONTEND_URL`; HMAC webhook verification (Paystack + Stripe); price tamper detection on order creation and payment init; timing-safe signature comparison; `escapeHtml` on all email user content; BOM stripping on all API keys and emails
- **Resilience** — in-memory caching, `withTimeout` on every Supabase query, `singleFlight` to coalesce concurrent requests, stale-while-revalidate, graceful fallback on DB outages

---

## 7. Features: What Is NOT Working / Incomplete

### Critical
| Issue | Detail |
|---|---|
| **`FRONTEND_URL` is `localhost:3000`** | The production backend `.env` has `FRONTEND_URL=http://localhost:3000`. CORS will block ALL browser requests from `hilgod.com`. Must be set to `https://hilgod.com,https://www.hilgod.com` on the Vercel backend project and redeployed. |
| **Bank account number is placeholder** | `BANK_ACCOUNT_NUMBER=0000000000` in the backend `.env`. Customers choosing Bank Transfer will see fake account details. |
| **Google OAuth client secret in repo** | `client_secret_662682454869-…json` is committed to the project root. This is a live credential. Revoke it in Google Cloud Console and regenerate immediately. Remove from git history. |

### Payments
| Issue | Detail |
|---|---|
| Stripe — gated by feature flag | Live Stripe keys are set in `.env`. The frontend only activates Stripe if `NEXT_PUBLIC_STRIPE_ENABLED=true` is set in the frontend Vercel env. The backend key check also validates the key format. If those conditions are met, Stripe is ready; otherwise it returns 503. |
| Grey payments — non-functional stub | `GREY_API_KEY` is still `your-grey-api-key`. Returns 503 immediately. The Grey API endpoint is assumed (`/v1/payment-links`) but never verified. Not ready for use. |
| No Paystack payment verification endpoint | After Paystack redirects the user back to `/checkout`, the frontend relies entirely on the webhook to mark the order paid. If the webhook is delayed, the user lands back on checkout with the order still showing `pending`. A `GET /api/payment/verify/:reference` endpoint calling Paystack's verification API would close this gap. |

### Admin Analytics
| Issue | Detail |
|---|---|
| `/admin/analytics` page uses stats endpoint | The analytics page calls `/api/admin/stats`, which only returns the 10 most recent orders. Order status breakdown, revenue over time, and top products are all derived from that tiny sample. A dedicated `/api/admin/analytics` endpoint with broader queries is needed for meaningful data. |

### Data Integrity
| Issue | Detail |
|---|---|
| Two review tables | `product_reviews` (schema.sql, UNIQUE per user per product) and `reviews` (schema.sql, no uniqueness) are both present. The `/api/reviews` route writes to `reviews`. The admin stats route reads from `product_reviews`. They are completely separate — a user can submit multiple reviews via the API, and admin stats show different data than product pages. One table should be canonical. |
| `schema.sql` is incomplete | Five tables exist in the live DB and backend code but are missing from `schema.sql`: `flash_sales`, `exchange_rates`, `return_requests`, `rider_applications`, `newsletter_subscribers`. A fresh DB deploy from `schema.sql` alone will fail at runtime on these features. |

### Minor Gaps
| Issue | Detail |
|---|---|
| `opay` accepted as payment method but has no implementation | `allowedPaymentMethods` in order creation includes `opay`, but there is no `/api/opay` route and no frontend option. Orders created with `paymentMethod: 'opay'` would be created with no way to pay. |
| Debug `console.log` in stores.js requireAdmin | Logs full admin check state (user ID, profile, error) on every admin request — production noise. Should be removed or gated on `NODE_ENV === 'development'`. |
| No seller payout / withdrawal flow | Sellers can view their sales totals but there is no mechanism to request or receive a payout. Revenue is tracked but never moved. |
| No seller-to-buyer messaging | No chat, contact form, or dispute mechanism between buyers and sellers. |
| Blog has no CMS | Blog posts are hardcoded with "Coming Soon" labels. No backend, no editor, no published content. |
| Careers page — applications go to email only | Open roles listed are static. The "Send Your CV" button opens a mailto link; there is no application form or tracking system. |
| `SUPPORT_PHONE` is placeholder | Set to `+123` in the backend `.env`. Appears in email footers sent to customers. |

---

## 8. Security Issues Summary

| Severity | Issue | Fix |
|---|---|---|
| **Critical** | Google OAuth client secret JSON file committed to repo | Delete file, remove from git history, revoke + regenerate credential |
| **High** | `FRONTEND_URL=localhost:3000` in production backend env | Set to `https://hilgod.com,https://www.hilgod.com` on Vercel backend, redeploy |
| **Medium** | Bank account placeholder `0000000000` in env | Set real bank details before going live |
| **Low** | Debug logs in `stores.js` requireAdmin | Remove or gate behind dev check |

---

## 9. What Needs to Happen Before Go-Live

1. Fix `FRONTEND_URL` on Vercel backend env (CORS will block all production API calls otherwise)
2. Set real bank account details in backend env
3. Delete and revoke the Google OAuth client secret from the repo
4. Either enable Stripe (`NEXT_PUBLIC_STRIPE_ENABLED=true` on frontend Vercel) or remove it from the checkout UI
5. Decide on the `reviews` / `product_reviews` table conflict — pick one and migrate data
6. Add the 5 missing tables to `schema.sql` so the schema is the source of truth
7. Remove `opay` from `allowedPaymentMethods` or implement it
8. Replace `SUPPORT_PHONE=+123` in backend env with the real support number
9. Verify Resend domain (`hilgod.com`) is confirmed in the Resend dashboard before emails go live
10. Update Supabase Auth redirect URLs to include `https://hilgod.com/**` and `https://www.hilgod.com/**`
