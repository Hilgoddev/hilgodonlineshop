# Hilgod Online Shop — Full Project Audit
> Generated: 2026-06-01

---

## 1. Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js (Pages Router), React 19, JavaScript (+ some TS config) |
| Backend | Node.js + Express 5, deployed as Vercel Serverless Functions |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth — email/password + Google OAuth |
| Payments | Paystack (primary), Stripe (optional/disabled), Grey (stub), Bank Transfer, Pay on Delivery |
| Email | Resend API |
| File Storage | Supabase Storage (`product-images` bucket) |
| Rate Limiting | `express-rate-limit` |
| Caching | In-memory (custom resilience helpers — `makeCache`, `singleFlight`) |
| Currency | Multi-currency via `exchange_rates` table + `CurrencyContext` |

---

## 2. Database Tables (from schema.sql + migrations)

| Table | Purpose |
|---|---|
| `profiles` | Extended user data — name, avatar, role (customer/seller/admin) |
| `categories` | Dynamic taxonomy with parent/child hierarchy |
| `stores` | Seller storefronts (pending/approved/rejected) |
| `products` | Product catalog with stock, status, seller/store links |
| `product_reviews` | Star ratings on products (1 review per user per product) |
| `reviews` | Separate review table used by `/api/reviews` route — overlaps with `product_reviews` |
| `orders` | Order header — status, total, currency, shipping address |
| `order_items` | Line items — product, quantity, price, fulfillment_status, seller |
| `cart_items` | Persistent per-user cart |
| `wishlist_items` | Per-user product wishlist |
| `payment_events` | Idempotency log for Paystack/Stripe webhooks |
| `seller_applications` | Seller onboarding applications |
| `exchange_rates` | USD base rates for NGN/GBP/EUR |
| `flash_sales` | Time-limited sale prices (from migration) |
| `return_requests` | Customer return submissions |
| `rider_applications` | Delivery partner sign-ups |
| `newsletter_subscribers` | Email newsletter list |

---

## 3. Backend API Endpoints

### Health
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/health` | — | Liveness check |
| GET | `/api/db-test` | — | Supabase connectivity check |

### Auth (`/api/auth`)
| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/sync-profile` | JWT | Upserts profile after login/signup |
| POST | `/auto-confirm` | — | Dev-only; disabled when `EMAIL_VERIFICATION_ENABLED != false` |
| GET | `/me` | JWT | Returns current user profile |

### Products (`/api/products`)
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/` | — | List with category/search/pagination; cached; stale-while-revalidate |
| GET | `/:id` | — | Single product |
| POST | `/` | JWT (seller) | Create product |
| PUT | `/:id` | JWT (seller) | Update product |
| DELETE | `/:id` | JWT (seller) | Delete product |

### Orders (`/api/orders`)
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/` | JWT | User's own orders |
| POST | `/` | JWT | Create order (server-side price validation, anti-tamper) |
| GET | `/all` | JWT (admin) | Paginated all orders |
| GET | `/:id` | JWT | Single order (owner or admin) |
| PUT | `/:id` | JWT (admin) | Update order status |

### Payment — Paystack (`/api/payment`)
| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/initialize` | JWT | Init Paystack transaction |
| POST | `/initiate` | JWT | Alias for `/initialize` |
| POST | `/webhook` | — | HMAC-verified; idempotent via `payment_events` |
| GET | `/bank-details` | — | Returns bank info from env vars |

### Payment — Stripe (`/api/stripe`)
| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/create-payment-intent` | JWT | Returns 503 if key not configured |
| POST | `/webhook` | — | Signature-verified Stripe events |

### Payment — Grey (`/api/grey`)
| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/create-payment` | JWT | Returns 503 — not configured |
| POST | `/webhook` | — | Stub; Grey API endpoint assumed |

### User (`/api/user`)
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/profile` | JWT | Get profile |
| PUT | `/profile` | JWT | Update name/avatar |
| PUT | `/password` | JWT | Change password |

### Cart (`/api/cart`)
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/` | JWT | Get cart items |
| POST | `/` | JWT | Add to cart |
| PUT | `/:productId` | JWT | Update quantity |
| DELETE | `/:productId` | JWT | Remove item |

### Wishlist (`/api/wishlist`)
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/` | JWT | Get wishlist |
| POST | `/` | JWT | Add to wishlist |
| DELETE | `/:productId` | JWT | Remove from wishlist |

### Seller (`/api/seller`)
| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/apply` | JWT | Submit seller application |
| GET | `/application-status` | JWT | Check own application |
| GET | `/dashboard` | JWT (seller) | Products + sales metrics |
| GET | `/analytics` | JWT (seller) | Per-product breakdown |
| GET | `/orders` | JWT (seller) | Orders containing seller's products |
| PATCH | `/order-items/:id/status` | JWT (seller) | Update fulfillment (packed/shipped/delivered/cancelled) |

### Admin (`/api/admin`)
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/stats` | JWT (admin) | Dashboard overview |
| GET | `/customers` | JWT (admin) | Paginated customer list |
| GET | `/sellers` | JWT (admin) | All sellers |
| DELETE | `/customers/:id` | JWT (admin) | Delete user |
| PUT | `/promote` | JWT (admin) | Change user role |
| GET | `/seller-applications` | JWT (admin) | Pending applications |
| POST | `/approve-seller/:user_id` | JWT (admin) | Approve + email seller |
| POST | `/reject-seller/:user_id` | JWT (admin) | Reject + email seller |
| GET | `/riders` | JWT (admin) | Rider applications |
| PUT | `/riders/:id` | JWT (admin) | Approve/reject rider |
| DELETE | `/riders/:id` | JWT (admin) | Delete rider record |

### Stores (`/api/stores`)
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/` | — | All approved stores |
| GET | `/:slug` | — | Single store by slug |
| POST | `/` | JWT (seller) | Create store |
| PUT | `/:id` | JWT (seller) | Update store |
| PUT | `/:id/status` | JWT (admin) | Approve/reject store |

### Categories (`/api/categories`)
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/` | — | All active categories (cached 5 min; has fallback list) |
| POST | `/` | JWT (admin) | Create category |
| PUT | `/:id` | JWT (admin) | Update category |
| DELETE | `/:id` | JWT (admin) | Delete category |

### Flash Sales (`/api/flash-sales`)
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/` | — | Active non-expired sales |
| GET | `/all` | JWT (admin) | All including expired |
| POST | `/` | JWT (admin) | Create flash sale |
| PUT | `/:id` | JWT (admin) | Edit flash sale |
| DELETE | `/:id` | JWT (admin) | Delete flash sale |

### Reviews (`/api/reviews`)
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/:productId` | — | Reviews for a product |
| POST | `/` | JWT | Submit review |

### Returns (`/api/returns`)
| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/` | JWT | Submit return request |
| GET | `/` | JWT (admin) | List returns |
| PUT | `/:id` | JWT (admin) | Update return status |

### Misc
| Method | Path | Notes |
|---|---|---|
| POST | `/api/newsletter/subscribe` | Rate-limited; saves to DB + sends email |
| POST | `/api/delivery/apply` | Saves rider application; emails admin + applicant |
| GET | `/api/exchange-rates` | Cached 10 min; static fallback |
| POST | `/api/upload/product-image` | JWT; 5 MB limit; uploads to Supabase Storage |

---

## 4. Frontend Pages

### Public / Marketing
| Page | Route |
|---|---|
| Homepage | `/` — hero slider, category grid, flash sales, bestsellers, section rows |
| About | `/about` |
| Blog | `/blog` — static, no CMS backend |
| Careers / Delivery | `/careers`, `/delivery` — delivery partner application form |
| Privacy Policy | `/privacy` |
| Terms | `/terms` |
| Flash Sales | `/flash-sales` |
| Track Order | `/track-order` — frontend form exists, no dedicated backend tracker |

### Catalog
| Page | Route |
|---|---|
| Product Listing | `/products` |
| Product Detail | `/products/[id]` |
| Category Listing | `/categories` |

### User
| Page | Route |
|---|---|
| Account | `/account` |
| Cart | `/cart` |
| Checkout | `/checkout` — Paystack, Stripe, bank transfer, pay on delivery |
| Wishlist | `/wishlist` |
| Return Request | `/return-request` |

### Auth
| Page | Route |
|---|---|
| Login | `/auth/login` |
| Signup | `/auth/signup` |
| Forgot Password | `/auth/forgot-password` |
| Reset Password | `/auth/reset-password` |
| OAuth Callback | `/auth/callback` |

### Seller Portal (requires `seller` or `admin` role)
| Page | Route |
|---|---|
| Seller Zone (apply) | `/seller-zone` |
| Dashboard | `/seller/dashboard` |
| Products | `/seller/products` |
| Orders | `/seller/orders` |
| Analytics | `/seller/analytics` |
| Store Settings | `/seller/store` |

### Admin Panel (requires `admin` role)
| Page | Route |
|---|---|
| Dashboard | `/admin` |
| Products | `/admin/products` |
| Orders | `/admin/orders` |
| Customers | `/admin/customers` |
| Sellers | `/admin/sellers` |
| Stores | `/admin/stores` |
| Categories | `/admin/categories` |
| Flash Sales | `/admin/flash-sales` |
| Approvals | `/admin/approvals` |
| Analytics | `/admin/analytics` |
| Riders | `/admin/riders` |

### Dev / Test
| Page | Route |
|---|---|
| System Test | `/system-test` — DB/API connectivity test page |

---

## 5. Features: Working

- **Authentication** — Supabase email/password + Google OAuth; profile auto-synced on login; JWT verified via local JWKS cache (fast, no GoTrue per request)
- **Auth token caching** — 5-minute in-memory cache prevents repeated GoTrue calls that were timing out payment requests
- **Product catalog** — listing, search, category filter, pagination; stale-while-revalidate cache; flash sale prices applied server-side
- **Cart** — DB-persisted per-user; flash sale pricing reflected; add/update/remove
- **Wishlist** — DB-persisted per-user
- **Checkout** — multi-step; Paystack fully wired end-to-end; bank transfer info served from env; Pay on Delivery creates order in `processing` status
- **Paystack payments** — initialize → redirect → webhook (HMAC-verified, idempotent via `payment_events`); stock decremented and cart cleared on `charge.success`
- **Order creation** — server-side price validation (anti-tamper); delivery fee logic (free over ₦50,000); stock availability check; email confirmation sent
- **Order status emails** — Resend API; order confirmation, status updates, seller notifications
- **Flash sales** — admin creates sale with timer; sale price applied server-side; countdown timer on frontend; expired sales excluded
- **Admin dashboard** — stats (products, orders, customers, revenue), recent orders, low stock alerts, pending approval counts
- **Admin: Customer management** — list, delete, promote role
- **Admin: Seller applications** — list, approve (sets role to `seller`, sends email), reject
- **Admin: Rider management** — list, approve/reject rider applications
- **Admin: Order management** — view all, update status
- **Admin: Store/product approval** — stores can be approved/rejected
- **Seller portal** — dashboard (metrics, products), analytics (per-product sales), order view with fulfillment status control, store settings
- **Seller application workflow** — user applies → admin reviews → approval email sent → role set to `seller`
- **Product image upload** — Supabase Storage; 5 MB limit; JPEG/PNG/WebP/GIF
- **Return requests** — authenticated submission, admin review, email notifications
- **Product reviews** — authenticated; name/email sourced from verified profile
- **Multi-currency display** — exchange rates from DB with static fallback; `CurrencyContext` used site-wide
- **Newsletter subscription** — rate-limited; upsert (no duplicate errors); confirmation email to subscriber + alert to admin
- **Delivery partner application** — saved to `rider_applications`, emails admin and applicant
- **Rate limiting** — general, admin, newsletter, delivery endpoints all rate-limited separately
- **Security headers** — Helmet; CORS restricted to `FRONTEND_URL`; raw body for webhook routes before JSON parser
- **Input sanitization** — BOM/zero-width character stripping on email fields; `escapeHtml` on all user-supplied email content

---

## 6. Features: Incomplete or Missing

### Payments
| Issue | Detail |
|---|---|
| Stripe disabled by default | Returns 503 unless `NEXT_PUBLIC_STRIPE_ENABLED=true` and a real `sk_live_`/`sk_test_` key is set. Functionality is coded; just needs keys. |
| Grey payments — stub only | Returns 503. The API endpoint (`/v1/payment-links`) is assumed; no real integration. Grey's actual API spec is not implemented. |
| Paystack verification on frontend | After Paystack redirect returns to `/checkout`, the frontend should call a verify endpoint. There is no `GET /api/payment/verify/:reference` endpoint — the webhook handles this server-side, but if Paystack's webhook is delayed, the user may see an unconfirmed order. |

### Admin
| Issue | Detail |
|---|---|
| No admin analytics endpoint | `/admin/analytics` page exists in frontend, but there is no `/api/admin/analytics` route. Only `/api/admin/stats` exists. |
| No product CRUD in admin routes | Admin can view products via stats, but product create/edit/delete/approve is done through the same `/api/products` endpoint as sellers. Admin panel product page may be missing dedicated admin-only controls. |
| Admin categories page | Frontend page exists; the categories route has admin CRUD — this should be working, but not verified end-to-end. |

### Seller Portal
| Issue | Detail |
|---|---|
| No revenue payout / withdrawal flow | Sellers can view their sales totals but there is no payout or earnings withdrawal system. |
| No seller-to-buyer messaging | No chat or messaging feature between buyers and sellers. |

### Reviews
| Issue | Detail |
|---|---|
| Duplicate review tables | Schema has `product_reviews` (one-review-per-user constraint) AND a separate `reviews` table. The `/api/reviews` route writes to `reviews`. Admin stats read from `product_reviews`. These are two different tables storing the same concept — one is likely orphaned. |

### Order Tracking
| Issue | Detail |
|---|---|
| Track Order page — no backend | `/track-order` frontend page exists but there is no `/api/orders/track` or similar endpoint. Buyers can look up orders through `/account`, but the dedicated tracking page probably calls a missing endpoint. |

### Blog
| Issue | Detail |
|---|---|
| No CMS or blog backend | `/blog` is a static frontend page. No blog posts, no CMS, no API. |

### Security Concerns
| Issue | Detail |
|---|---|
| Google OAuth client secret in repo | `client_secret_662682454869-...json` is in the project root. This file should NOT be committed to git. Revoke and regenerate the OAuth client secret immediately. |
| Debug `console.log` in production | `stores.js` requireAdmin middleware logs full admin check state including user IDs to stdout on every admin request. Should be removed or gated behind `NODE_ENV === 'development'`. |

### Infrastructure / Missing Tables
| Issue | Detail |
|---|---|
| `flash_sales` not in schema.sql | Used extensively in code and migrations, but missing from the main `schema.sql`. New deployments must run migration `001_sync_sellers_stores.sql` or similar to get this table. |
| `exchange_rates` not in schema.sql | Similarly, only created via migration `002_add_exchange_rates_table.sql`. |
| `return_requests`, `rider_applications`, `newsletter_subscribers` not in schema.sql | Referenced in backend code but not in `schema.sql`. New DB setups will fail on these. |

### Minor Gaps
| Issue | Detail |
|---|---|
| Seller store creation not enforced | A seller can submit products without a store. The `store_id` is optional on products; seller zone should require store setup before listing. |
| No product approval queue in admin UI | Admin can set `product.status = approved` via the PUT `/api/products/:id` endpoint, but the admin approvals page may not have a dedicated product approval flow. |
| `opay` listed as payment method in validation | `opay` is an allowed value in order creation (`allowedPaymentMethods`), but there is no `/api/opay` route or frontend option for it. |

---

## 7. Summary

**Working well:** The core e-commerce loop (browse → cart → checkout → Paystack → order confirmation email) is solid. Auth, seller portal, admin panel, flash sales, returns, and the resilience layer (caching, timeouts, singleFlight) are all implemented thoughtfully.

**Biggest gaps:**
1. Google OAuth secret in the repo — **urgent security issue**
2. The two review tables need to be reconciled
3. Track Order page has no backend
4. Grey payments are not implemented
5. Admin analytics endpoint is missing
6. `schema.sql` is out of sync with actual tables (flash_sales, exchange_rates, return_requests, rider_applications, newsletter_subscribers are all missing)
