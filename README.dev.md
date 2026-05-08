# Hilgod Online Store

A full-stack Nigerian e-commerce marketplace. Supports multi-role users (customers, sellers, admins), Paystack payments, Supabase Storage image uploads, transactional email, and a fully dynamic product catalog.

**Live:**
- Store — https://hilgod-frontend.onrender.com
- API — https://hilgodonlineshop.onrender.com

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React 19 |
| Backend | Express.js 5, Node.js 18+ |
| Database | Supabase (PostgreSQL + Row Level Security) |
| Auth | Supabase Auth (email/password + Google OAuth) |
| Storage | Supabase Storage (`product-images` bucket) |
| Payments | Paystack (HMAC-signed webhook) |
| Email | Resend API |
| Hosting | Render (two Node.js Web Services) |

---

## Project Structure

```
Hilgodonlineshop/
├── backend/                  Express.js API
│   └── src/
│       ├── config/
│       │   └── supabase.js   Supabase service-role client
│       ├── middleware/
│       │   └── rateLimit.js
│       ├── routes/
│       │   ├── auth.js       Signup, login, Google OAuth, token verify
│       │   ├── products.js   Product CRUD
│       │   ├── orders.js     Order placement + status lifecycle + emails
│       │   ├── seller.js     Seller dashboard, analytics, orders
│       │   ├── admin.js      Platform stats, approvals, user management
│       │   ├── upload.js     POST /api/upload/product-image
│       │   ├── categories.js (5-min in-memory cache)
│       │   ├── cart.js
│       │   ├── wishlist.js
│       │   ├── reviews.js
│       │   ├── stores.js
│       │   ├── user.js
│       │   └── payment.js    Paystack init + HMAC webhook
│       └── services/
│           └── email.js      Resend transactional email
│
├── frontend/                 Next.js app
│   ├── components/
│   │   ├── Navbar.js         Role-aware nav (Admin / Seller / Customer)
│   │   ├── Footer.js
│   │   ├── Layout.js
│   │   ├── ShopProvider.js   Cart + wishlist context
│   │   ├── SellerGuard.js
│   │   └── admin/AdminLayout.js
│   ├── contexts/
│   │   ├── AuthContext.js
│   │   └── CurrencyContext.js
│   ├── lib/
│   │   ├── apiClient.js      Auth-aware fetch wrapper
│   │   └── supabaseClient.js Supabase anon client
│   ├── pages/
│   │   ├── index.js          Homepage + flash sales
│   │   ├── products/         Catalog + product detail
│   │   ├── cart.js
│   │   ├── checkout.js
│   │   ├── wishlist.js
│   │   ├── account.js        Orders, profile, settings
│   │   ├── track-order.js
│   │   ├── seller-zone.js    Seller application
│   │   ├── delivery.js       Delivery partner application
│   │   ├── seller/
│   │   │   ├── dashboard.js
│   │   │   ├── products.js   Upload with Supabase Storage file picker
│   │   │   ├── analytics.js  Per-product revenue charts
│   │   │   └── orders.js     Customer orders scoped to seller
│   │   └── admin/
│   │       ├── index.js      Platform dashboard
│   │       ├── products.js
│   │       ├── orders.js
│   │       ├── customers.js  User management + role switching
│   │       └── analytics.js  Platform-level metrics
│   └── css/
│
└── Docs/
    └── Project_Progress_Report.md
```

---

## Local Setup

### Prerequisites

- Node.js 18+
- A Supabase project with schema applied (`backend/supabase/schema.sql`)

### Backend

```bash
cd backend
npm install
npm run dev        # hot reload via node --watch
```

**`backend/.env`**

```env
PORT=5000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
PAYSTACK_SECRET_KEY=your-paystack-secret-key
RESEND_API_KEY=your-resend-api-key
ADMIN_EMAIL=admin@yoursite.com
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
EMAIL_VERIFICATION_ENABLED=false
```

### Frontend

```bash
cd frontend
npm install
npm run dev        # http://localhost:3000
```

**`frontend/.env.local`**

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_URL=http://localhost:5000
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

---

## User Roles

| Role | Access |
|---|---|
| `customer` | Shop, cart, wishlist, orders, reviews, order tracking |
| `seller` | Above + seller dashboard, product upload (file picker), analytics, customer orders view |
| `admin` | Above + platform dashboard, user management, product/store/seller approvals, analytics |

Sellers are promoted by an admin via the seller application workflow or directly through the User Management page. The navbar and dropdowns automatically adjust based on the logged-in role.

---

## Key Features

### Product Image Upload
Sellers upload images directly from their device on the `/seller/products` page. Images go to the `product-images` Supabase Storage bucket under `{userId}/{timestamp}.ext`. A URL text input is available as a fallback.

- `POST /api/upload/product-image` — multipart, field `image`, returns `{ success, url }`
- Allowed: JPEG, PNG, WebP, GIF · Max: 5 MB · Auth required

### Transactional Email (Resend)
All emails are fire-and-forget and never block API responses. Silently skipped when `RESEND_API_KEY` is not set.

| Trigger | Recipient |
|---|---|
| Order placed | Buyer — itemised receipt |
| Order status updated | Buyer — new status |
| Seller application approved | Seller — dashboard link |
| Newsletter subscribe | Subscriber — welcome |
| Delivery partner application | Admin (`ADMIN_EMAIL`) |

### Payments (Paystack)
`POST /api/payment/initialize` starts a transaction. `POST /api/payment/webhook` verifies the HMAC-SHA512 signature and marks the order `paid` idempotently. Requires a live Paystack secret key.

### Categories Cache
`GET /api/categories` is cached in-memory for 5 minutes with `Cache-Control: public, max-age=300`. The cache is cleared on any create/update/delete.

### Role-Aware Navbar
- "Sell on Hilgod" is hidden for approved sellers and admins
- Seller tools are grouped and separated from general account links by a divider
- Dropdown header shows avatar initials (or photo), full name, truncated email, and a role badge (green Seller / purple Admin)
- Mobile menu shows the same email + role badge in the user panel

---

## Deployment (Render)

Both services deploy automatically from `main`.

| Service | Type | Build | Start |
|---|---|---|---|
| Backend | Node.js Web Service | `npm install` | `node src/index.js` |
| Frontend | Node.js Web Service | `npm install --include=dev && npm run build` | `npm run start` |

**Backend Render env vars:**  
`PORT` · `SUPABASE_URL` · `SUPABASE_SERVICE_ROLE_KEY` · `PAYSTACK_SECRET_KEY` · `RESEND_API_KEY` · `ADMIN_EMAIL` · `FRONTEND_URL` · `NODE_ENV=production` · `EMAIL_VERIFICATION_ENABLED`

**Frontend Render env vars:**  
`NEXT_PUBLIC_SUPABASE_URL` · `NEXT_PUBLIC_SUPABASE_ANON_KEY` · `NEXT_PUBLIC_API_URL` · `GOOGLE_CLIENT_ID` · `GOOGLE_CLIENT_SECRET`

> **Cold-start:** Render free-tier services sleep after 15 min. The frontend fires a health ping to `/api/health` on first page load to wake the backend early.

---

## API Reference (Selected Endpoints)

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/health` | None | Health check |
| `POST` | `/api/auth/signup` | None | Email/password signup |
| `POST` | `/api/auth/login` | None | Login |
| `GET` | `/api/products` | None | List/search/filter products |
| `GET` | `/api/products/:id` | None | Single product |
| `POST` | `/api/products` | Seller/Admin | Create product |
| `PUT` | `/api/products/:id` | Seller/Admin | Update product |
| `DELETE` | `/api/products/:id` | Seller/Admin | Soft-delete product |
| `POST` | `/api/upload/product-image` | Any auth | Upload image → Supabase Storage |
| `GET` | `/api/seller/dashboard` | Seller | Metrics + product list |
| `GET` | `/api/seller/analytics` | Seller | Per-product revenue breakdown |
| `GET` | `/api/seller/orders` | Seller | Customer orders for seller's products |
| `GET` | `/api/admin/stats` | Admin | Platform-wide metrics |
| `GET` | `/api/orders` | User | Own orders |
| `POST` | `/api/orders` | User | Place order |
| `PUT` | `/api/orders/:id` | Admin | Update order status |
| `POST` | `/api/payment/initialize` | User | Start Paystack payment |
| `POST` | `/api/payment/webhook` | Paystack | HMAC payment callback |
| `POST` | `/api/newsletter/subscribe` | None | Newsletter sign-up |
| `POST` | `/api/delivery/apply` | None | Delivery partner application |

---

## Test Accounts

| Role | Email | Password |
|---|---|---|
| Admin | hilgoddev@gmail.com | `********!` |
| Seller | linuxrate@gmail.com | `********` |

> Change both passwords before any public demo.

The seller account has an approved store (**TechMart NG**, slug: `techmart-ng`) with 40 products across all categories.

---

## Remaining Client Actions Before Handover

- [ ] Create Supabase project, run `backend/supabase/schema.sql`, update all `SUPABASE_*` env vars on Render
- [ ] Complete Paystack KYC, set `PAYSTACK_SECRET_KEY` on Render, add webhook URL in Paystack dashboard
- [ ] Register on Resend, set `RESEND_API_KEY` and `ADMIN_EMAIL` on Render
- [ ] Set `EMAIL_VERIFICATION_ENABLED=true` once Resend is configured
- [ ] Create Google Cloud OAuth client, update redirect URI, set `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` on Render
- [ ] Create first admin account: sign up on the platform → set `role = 'admin'` in Supabase Table Editor
- [ ] Upgrade Supabase to Pro Plan to enable HaveIBeenPwned leaked-password protection
