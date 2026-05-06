# Render Hosting Guide — Hilgod Online Shop

**Last Updated:** 2026-05-06
**Stack:** Next.js 16 (Frontend) + Express.js 5 (Backend) + Supabase (DB + Auth) + Paystack (Payments)

This guide walks through deploying the Hilgod Online Shop to Render — one service for the backend API and one for the Next.js frontend.

---

## Overview

You will create **two Render services**:

| Service | Type | Purpose |
|---|---|---|
| `hilgod-backend` | Web Service (Node) | Express.js API — handles all business logic, payments, auth |
| `hilgod-frontend` | Web Service (Node) | Next.js app — serves the customer-facing UI |

Both services communicate over HTTPS. The frontend proxies all `/api/*` requests to the backend via `next.config.js`.

---

## Prerequisites

Before deploying, you must have:

- [ ] A Render account at https://render.com (free tier works)
- [ ] Your GitHub/GitLab repo connected to Render
- [ ] Your own Supabase project set up with the schema applied (see Section 5.1 of Project_Status_Report.md)
- [ ] Your own Paystack account with a live secret key
- [ ] Google OAuth credentials (Client ID from Google Cloud Console)

---

## Step 1 — Deploy the Backend

### 1.1 Create the Web Service

1. Log in to https://render.com
2. Click **New +** > **Web Service**
3. Connect your GitHub repository
4. Configure the service:

| Setting | Value |
|---|---|
| **Name** | `hilgod-backend` (or your preferred name) |
| **Region** | Oregon (US West) or Frankfurt (EU) — closest to your users |
| **Branch** | `main` |
| **Root Directory** | `backend` |
| **Runtime** | `Node` |
| **Build Command** | `npm install` |
| **Start Command** | `node src/index.js` |
| **Instance Type** | Free (for testing) or Starter ($7/mo for production) |

### 1.2 Set Environment Variables

In the Render dashboard for `hilgod-backend`, go to **Environment** and add:

| Key | Value |
|---|---|
| `SUPABASE_URL` | `https://YOUR_PROJECT.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service_role secret key |
| `PAYSTACK_SECRET_KEY` | Your Paystack live secret key (`sk_live_...`) |
| `NODE_ENV` | `production` |
| `PORT` | `5000` |
| `FRONTEND_URL` | `https://hilgod-frontend.onrender.com` (your actual frontend URL — update after Step 2) |

**Important:** Do NOT put quotes around values in Render's environment variable UI.

### 1.3 Deploy

Click **Create Web Service**. Render will:
1. Pull your repo
2. Run `npm install` in `/backend`
3. Start `node src/index.js`

Watch the **Logs** tab. A successful start shows:
```
Server running in production mode on port 5000
```

### 1.4 Verify the Backend

Once deployed, visit:
```
https://hilgod-backend.onrender.com/api/health
```

Expected response:
```json
{"status": "success", "message": "API is running successfully"}
```

Also test the database connection:
```
https://hilgod-backend.onrender.com/api/db-test
```

---

## Step 2 — Deploy the Frontend

### 2.1 Create the Web Service

1. In Render, click **New +** > **Web Service**
2. Connect the same repository
3. Configure:

| Setting | Value |
|---|---|
| **Name** | `hilgod-frontend` |
| **Region** | Same as backend |
| **Branch** | `main` |
| **Root Directory** | `frontend` |
| **Runtime** | `Node` |
| **Build Command** | `npm install && npm run build` |
| **Start Command** | `npm start` |
| **Instance Type** | Free (testing) or Starter (production) |

### 2.2 Set Environment Variables

| Key | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://YOUR_PROJECT.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon/public key |
| `NEXT_PUBLIC_API_URL` | `https://hilgod-backend.onrender.com` |
| `GOOGLE_CLIENT_ID` | Your Google OAuth Client ID |
| `NODE_ENV` | `production` |

### 2.3 Deploy

Click **Create Web Service**. The build will take 3-5 minutes.

Successful build output ends with:
```
Route (pages)                              Size     First Load JS
...
info  - Generating static pages
✓ Done
```

---

## Step 3 — Link Frontend and Backend

### 3.1 Update Backend CORS

Once both services are deployed and you have the frontend URL, go back to `hilgod-backend` environment variables and update:

```
FRONTEND_URL=https://hilgod-frontend.onrender.com
```

Trigger a manual redeploy of the backend (click **Manual Deploy** in Render dashboard).

### 3.2 Verify Frontend Connects to Backend

Visit your frontend URL and open browser DevTools > Network. Log in or browse products. You should see `/api/*` requests returning data (not CORS errors or 500 errors).

---

## Step 4 — Configure Paystack Webhook

This is essential for payments to complete correctly. Without the webhook, orders will never be marked as `paid`.

### 4.1 Add Webhook in Paystack Dashboard

1. Log in to your Paystack dashboard at https://dashboard.paystack.com
2. Go to **Settings > API Keys and Webhooks**
3. Under **Webhooks**, click **Add Webhook**
4. Enter URL: `https://hilgod-backend.onrender.com/api/payment/webhook`
5. Select events: `charge.success`
6. Save

### 4.2 Test the Webhook

Paystack allows you to send a test webhook from the dashboard. After adding the webhook, send a test `charge.success` event and check the backend logs on Render for:
```
[payment webhook] charge.success processed for order_id: ...
```

---

## Step 5 — Set Up Google OAuth Redirect URIs

After deploying, Google OAuth's redirect URIs must include your live domains.

1. Go to https://console.cloud.google.com
2. Open your OAuth 2.0 Client ID
3. Under **Authorized redirect URIs**, add:
   - `https://YOUR_SUPABASE_PROJECT.supabase.co/auth/v1/callback`
4. Save

In Supabase Dashboard:
- Go to **Authentication > URL Configuration**
- Set **Site URL** to: `https://hilgod-frontend.onrender.com`
- Add to **Redirect URLs**: `https://hilgod-frontend.onrender.com/auth/login`

---

## Step 6 — First Admin Account Setup

After everything is running:

1. Sign up on your live platform at `https://hilgod-frontend.onrender.com/auth/signup`
2. Go to **Supabase Dashboard > Table Editor > profiles**
3. Find your row and change `role` from `customer` to `admin`
4. Return to the platform — you now have admin access at `/admin`

---

## Troubleshooting

### Backend Not Starting

Check the Render logs. Common causes:

| Error | Fix |
|---|---|
| `Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY` | Add the env vars in Render dashboard, redeploy |
| `Cannot find module 'paystack-api'` | Make sure you ran `npm install` in the backend root — check build command |
| `Error: listen EADDRINUSE` | Render assigns PORT automatically — ensure your backend reads `process.env.PORT` |
| Server exits immediately | Check for JavaScript syntax errors in logs — usually a missing export or require |

### Frontend Build Fails

| Error | Fix |
|---|---|
| `Module not found: lodash` | This was fixed — `lodash` removed from `apiClient.js`. Redeploy. |
| `Error: 'NEXT_PUBLIC_API_URL' is not defined` | Add the env var in Render dashboard before building |
| Build timeout | Free tier has build time limits. Upgrade to Starter or optimize the build. |

### CORS Errors in Browser

The backend allows requests only from `FRONTEND_URL`. If you see CORS errors:
1. Check that `FRONTEND_URL` in backend env matches the actual frontend URL exactly (no trailing slash)
2. Redeploy the backend after updating

### Paystack Payment Not Completing (Order Stays "Pending")

This means the webhook is not reaching the backend.
1. Check Paystack dashboard > Webhook logs for delivery failures
2. Confirm the webhook URL is exactly `https://YOUR-BACKEND.onrender.com/api/payment/webhook`
3. Check Render backend logs for incoming webhook requests
4. On the free tier, Render services spin down after 15 minutes of inactivity — the first webhook after spindown may time out. Upgrade to Starter ($7/mo) for always-on service.

### Free Tier Spindown (Slow First Load)

Render's free tier spins down after 15 minutes of inactivity. The first request after spindown takes 30-60 seconds to respond. For production use, upgrade to the Starter plan ($7/mo per service) to keep services always on.

---

## Render Service Summary

| Service | URL Pattern | Cost |
|---|---|---|
| Backend API | `https://hilgod-backend.onrender.com` | Free or $7/mo (Starter) |
| Frontend | `https://hilgod-frontend.onrender.com` | Free or $7/mo (Starter) |

**Recommended for production:** Both services on Starter plan = $14/mo total.

---

## Environment Variables Quick Reference

### Backend (`/backend` root directory)

```
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
PAYSTACK_SECRET_KEY=sk_live_...
NODE_ENV=production
PORT=5000
FRONTEND_URL=https://YOUR-FRONTEND.onrender.com
```

### Frontend (`/frontend` root directory)

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
NEXT_PUBLIC_API_URL=https://YOUR-BACKEND.onrender.com
GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID
NODE_ENV=production
```
