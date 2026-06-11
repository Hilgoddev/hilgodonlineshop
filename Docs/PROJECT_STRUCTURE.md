# Project Structure Overview

_Last updated: 2026-06-11. Stack: **Next.js** (frontend) + **Express/Supabase** (backend) +
Resend (email) + Paystack/Stripe/Grey (payments). Supabase project `nmrqdzikceakkhfhflja`._

```
hilgodonlineshop/
│
├── backend/                          # Express API (Vercel serverless) -> api.hilgod.com
│   ├── src/
│   │   ├── index.js                  # App entry: middleware, CORS, route mounting, raw-body webhooks
│   │   ├── config/
│   │   │   ├── supabase.js            # Supabase client (service-role key — bypasses RLS)
│   │   │   ├── paystack.js  stripe.js  grey.js   # Payment provider clients
│   │   ├── middleware/
│   │   │   ├── requireAdmin.js         # Shared admin-role guard (DB-backed)
│   │   │   └── rateLimit.js            # Per-action limiters (review/upload/password/write/payment)
│   │   ├── lib/
│   │   │   ├── orderStatus.js          # REVENUE_STATUSES (dashboards) + PAYABLE_STATUSES (withdrawable)
│   │   │   ├── settings.js             # platform_settings key/value accessor (auto-approve)
│   │   │   ├── resilience.js           # withTimeout, makeCache, singleFlight, getEmailMap
│   │   │   ├── env.js  validate.js
│   │   ├── routes/                     # All business logic + access control
│   │   │   ├── auth.js                 # verifyToken (JWKS), sync-profile
│   │   │   ├── products.js             # list/detail (ratings + on_sale filter), CRUD, approve
│   │   │   ├── orders.js               # order creation (server-side pricing), admin list, status
│   │   │   ├── payment.js  stripe.js  grey.js   # init + signed webhooks (idempotent, atomic claim)
│   │   │   ├── seller.js               # dashboard metrics, orders, earnings, payouts (+admin notify)
│   │   │   ├── admin.js                # stats, sellers, customers, payouts, badge-counts, settings
│   │   │   ├── stores.js               # public store + owner; create/update (unique name)
│   │   │   ├── campaigns.js            # flash/black_friday/easter; flash-sales.js = alias
│   │   │   ├── reviews.js              # /:productId, /recent, /overall
│   │   │   ├── cart.js  wishlist.js  categories.js  returns.js  user.js  upload.js  exchange-rates.js
│   │   ├── services/
│   │   │   ├── email.js                # Resend send + all HTML templates (order, payout, etc.)
│   │   │   └── paymentSuccess.js       # one-time post-payment: stock decrement + emails
│   │   ├── utils/ (pricing.js, cache.js, colorName.js)  scripts/ (validateEnv.js)
│   ├── supabase/migrations/            # 001..012 SQL (schema, payouts, settings, campaigns, options)
│   └── email-templates/                # Hilgod-branded Supabase auth email HTML
│
├── frontend/                         # Next.js (Pages Router) -> hilgod.com / www
│   ├── pages/
│   │   ├── index.js                   # Home: hero, categories, campaign sections, testimonials
│   │   ├── deals.js                   # unified deals hub (on_sale products)
│   │   ├── flash-sales.js  black-friday.js  easter.js   # per-type campaign storefronts
│   │   ├── products/index.js [id].js  # listing (server-paginated) + detail (variants, zoom, reviews)
│   │   ├── cart.js  checkout.js  wishlist.js  track-order.js  return-request.js
│   │   ├── stores/[slug].js           # public store page (seller details + WhatsApp contact)
│   │   ├── reviews.js                 # site-wide reviews page (built; currently unlinked — future)
│   │   ├── account/index.js           # buyer profile + orders
│   │   ├── seller/                    # dashboard, products, orders, store, payouts, analytics
│   │   ├── admin/                     # index, analytics, orders, products, approvals, sellers,
│   │   │                              #   stores, customers, categories, payouts, riders, flash-sales
│   │   ├── auth/ (login, signup, callback, forgot/reset-password)
│   │   ├── about, careers, delivery, blog, privacy, terms, seller-zone, categories
│   │   └── api/location-currency.js   # tiny geo helper (the only Next API route)
│   ├── components/
│   │   ├── Navbar.js  Footer.js  Layout.js  ShopProvider.js (cart/wishlist/quick-view ctx)
│   │   ├── ProductCard.js (ratings, store link, variant-aware add)  OrderDetailsModal.js
│   │   ├── HomeCampaignSection.js  HomeTestimonials.js  CampaignView.js  SellerInfo.js
│   │   ├── AuthGuard.js  AdminGuard.js  SellerGuard.js  ConfirmModal.js
│   │   └── admin/AdminLayout.js        # admin shell + attention badges
│   ├── contexts/ (AuthContext.js, CurrencyContext.js)
│   ├── lib/
│   │   ├── apiClient.js (apiFetch + token)  adminApi.js  catalogApi.js
│   │   ├── pricing.js (normalizePricing)  colorName.js (hex->name)  orderStatus.js (labels)
│   │   ├── env.js (resolveServerApiBase)  supabaseClient.js  blogPosts.js
│   ├── hooks/useAutoRefresh.js
│   └── css/ (main, header, footer, home, products, pages, fix.module.css)
│
└── Docs/                             # SYSTEM-FLOWS.md, PROJECT_STRUCTURE.md, API docs, guides
    (root also has HOW_IT_WORKS.md, HANDOVER.md, AUDIT_REPORT.md, AUTH_AND_OAUTH_SETUP.md,
     CUSTOM_DOMAIN_SETUP.md, scripts/make-handover.ps1)
```

## Key conventions
- **Backend is authoritative.** Prices, totals, and payment amounts are recomputed server-side;
  client values are only tamper signals. Access control is in Express middleware
  (`verifyToken`, `requireAdmin`/seller guards, `req.user.id` scoping) since the service-role key
  bypasses RLS.
- **Same-origin API.** The browser calls `/api/*`; Next.js rewrites it to `NEXT_PUBLIC_API_URL`
  (the backend), so there's no cross-origin/CORS dependency from the browser.
- **Money model.** Order `total_amount` includes the ₦1,500 delivery fee; seller revenue =
  product sales (excl. delivery); seller nets 90% (10% platform commission); dashboards count
  `REVENUE_STATUSES`, withdrawable uses `PAYABLE_STATUSES`.
- See `Docs/SYSTEM-FLOWS.md` for end-to-end flows and `HOW_IT_WORKS.md` for the feature walkthrough.
