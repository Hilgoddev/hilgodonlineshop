# Hilgod Online Shop — Handover & Setup Guide

This package contains the full source for the Hilgod marketplace: a Next.js frontend and
an Express/Supabase backend. Secrets are **not** included — you must supply your own
environment values (see below).

## Stack
- **Frontend:** Next.js (React) — `frontend/`
- **Backend:** Express + Supabase (Postgres) — `backend/`
- **Payments:** Paystack & Stripe
- **Email:** Resend

## Prerequisites
- Node.js 18+ and npm
- A Supabase project (Postgres database + Auth)
- Paystack and/or Stripe accounts
- A Resend account (transactional email)

## 1. Install dependencies
```
cd backend  && npm install
cd ../frontend && npm install
```

## 2. Configure environment variables
Copy each example file and fill in your own values:
```
cp backend/.env.example  backend/.env       # if no example, create backend/.env
cp frontend/.env.example frontend/.env.local
```

**Backend (`backend/.env`)** — required keys:
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`
- `PAYSTACK_SECRET_KEY`
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- `RESEND_API_KEY`
- `FRONTEND_URL` — **set to your live domain in production** (e.g. `https://www.hilgod.com`); email links use this.
- `ADMIN_EMAIL`, and optional `EMAIL_FROM_ORDERS`, `EMAIL_FROM_NOREPLY`

**Frontend (`frontend/.env.local`)** — `NEXT_PUBLIC_` values only (these reach the browser, so
never put the service-role key here):
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_API_URL`

> The backend refuses to start in production if a required key is missing.

## 3. Apply database migrations
Run every file in `backend/supabase/migrations/` **in numeric order** in the Supabase SQL
editor (001 → 011). They create the schema, payouts, platform settings, and campaigns.

## 4. Run locally
```
cd backend  && npm run dev      # API on :5000
cd frontend && npm run dev      # app on :3000
```

## 5. Build for production
```
cd frontend && npm run build
```
Deploy the frontend and backend to your host (the project has been run on Vercel). Configure
the same environment variables in the host's dashboard, and point Paystack/Stripe webhooks at
`/api/payment/webhook` and `/api/stripe/webhook`.

## Admin notes
- First admin: set a user's `role` to `admin` in the `profiles` table.
- Product approval can be automatic or manual — toggle **Auto-approve seller products** in
  Admin → Approvals.
- Payouts are manual: sellers request, admin approves in Admin → Payouts.
