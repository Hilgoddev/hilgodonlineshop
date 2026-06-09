# Custom Domain Setup — Hilgod Online Shop

This guide walks through pointing a custom domain (example: `hilgod.com`) at the
project, step by step. The stack is:

- **Frontend** — Next.js, deployed on Vercel (project under `hilgoddevs-projects`).
- **Backend** — Express API, deployed as a separate Vercel project (also under `hilgoddevs-projects`).
- **Auth/DB** — Supabase.
- **Email** — Resend (sends from `@hilgod.com` addresses).

The frontend talks to the backend through a Next.js rewrite: `/api/:path*` →
`NEXT_PUBLIC_API_URL`. So the browser only ever needs the **frontend** domain; the
backend domain is used internally by that rewrite and for CORS.

> Recommended domain layout
> - `hilgod.com` and `www.hilgod.com` → **frontend**
> - `api.hilgod.com` → **backend** (this project uses this)

---

## Current status (verified 2026-06-09)

| Item | Status |
|---|---|
| `hilgod.com` / `www.hilgod.com` (frontend) | ✅ Live — apex 307-redirects to `www`, HTTPS valid, DNS → Vercel |
| `api.hilgod.com` (backend) | ✅ Live — `/api/health` returns 200 over valid SSL, DNS → Vercel |
| `https://www.hilgod.com/email-logo.png` (email logo) | ✅ Reachable (200, image/png) |
| Frontend `NEXT_PUBLIC_API_URL` → `https://api.hilgod.com/api` | ⏳ Set on the frontend Vercel project + redeploy (Step 3) |
| Backend `FRONTEND_URL` includes apex + www | ⏳ Confirm on the backend Vercel project + redeploy (Step 3) |
| Supabase Auth Site URL / Redirect URLs → `hilgod.com` | ⏳ Confirm in the Supabase dashboard (Step 4) |
| Resend domain `hilgod.com` verified (SPF/DKIM) | ⏳ Confirm in Resend (Step 6) |
| Supabase vanity auth domain (e.g. `auth.hilgod.com`) | ➖ Not configured — optional; auth links use `…supabase.co` |

---

## Step 0 — Prerequisites

- [ ] You own the domain and can edit its DNS records (at your registrar or DNS host).
- [ ] You have access to both Vercel projects (frontend + backend).
- [ ] You have access to the Supabase project dashboard.
- [ ] You have access to the Resend dashboard (for email domain verification).
- [ ] If Google login is enabled: access to the Google Cloud OAuth consent / credentials screen.

---

## Step 1 — Add the domain to the FRONTEND Vercel project

1. Vercel → **frontend** project → **Settings → Domains**.
2. Add `hilgod.com`. Vercel will also offer to add `www.hilgod.com` — add both and set
   whichever you prefer as the **primary** (the other auto-redirects).
3. Vercel shows the DNS records you need. Typically:
   - **Apex** `hilgod.com` → `A` record to `76.76.21.21` (Vercel's IP), **or** an `ALIAS`/`ANAME`
     to `cname.vercel-dns.com` if your DNS host supports it.
   - **Subdomain** `www` → `CNAME` to `cname.vercel-dns.com`.
4. Add those records at your DNS host and wait for propagation (minutes to a few hours).
   Vercel marks the domain **Valid** and issues an SSL cert automatically once DNS resolves.

---

## Step 2 — Add the domain to the BACKEND Vercel project ✅ DONE

> **Status: verified & live (2026-06-09).** `https://api.hilgod.com/api/health` returns
> `200 {"status":"success",...}` over a valid SSL cert, served via Vercel to the backend.
> DNS: `api.hilgod.com` → `CNAME` → Vercel (`a99e00ed8adeaef8.vercel-dns-017.com` →
> `216.198.79.65`). The root path `/` returning 404 is expected — the API only serves `/api/*`.

1. Vercel → **backend** project → **Settings → Domains**.
2. Add `api.hilgod.com`.
3. Add the DNS record Vercel shows — usually `api` → `CNAME` → `cname.vercel-dns.com`.
4. Wait until it shows **Valid** with SSL issued.

This project **uses** `api.hilgod.com` for the backend, so `NEXT_PUBLIC_API_URL` must point at
it (see Step 3). If Vercel's dashboard ever shows it "pending" briefly, that's propagation lag
— externally it already resolves with a valid cert.

---

## Step 3 — Update environment variables

> After changing any env var on Vercel you MUST redeploy that project for it to take effect
> (Vercel does not hot-reload env vars). See Step 7.

### Frontend project env (Vercel → frontend → Settings → Environment Variables)

| Variable | Value to set | Status |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `https://api.hilgod.com/api` | **Set this on the frontend Vercel project, then redeploy** |

> Note the trailing `/api`. The rewrite is `source: /api/:path*` → `${NEXT_PUBLIC_API_URL}/:path*`,
> and the Express routes are mounted under `/api`, so the value must end in `/api`.
>
> The browser only ever calls the same-origin `/api/*` path (Next.js then proxies it to
> `NEXT_PUBLIC_API_URL`), so there is no cross-origin/CORS call from the browser to the API host.
> Local dev keeps `http://127.0.0.1:5000/api` in `frontend/.env.local` — leave that as-is.

### Backend project env (Vercel → backend → Settings → Environment Variables)

| Variable | New value | Why |
|---|---|---|
| `FRONTEND_URL` | `https://hilgod.com,https://www.hilgod.com` | CORS allowlist (comma-separated, no trailing slash) **and** the base URL used in email links |
| `EMAIL_FROM_ORDERS` | `Order Notifications <contact@hilgod.com>` | Only if the from-domain changes |
| `EMAIL_FROM_NOREPLY` | `Hilgod <noreply@hilgod.com>` | Only if the from-domain changes |
| `COMPANY_WEBSITE` | `hilgod.com` | Email footer link |
| `LOGO_URL` | `https://hilgod.com/logo.png` | Email footer logo |
| `SUPPORT_EMAIL` / `SUPPORT_PHONE` | as appropriate | Email footer |

The CORS check in `backend/src/index.js` splits `FRONTEND_URL` on commas and only allows
listed origins, so **every** front-facing host (apex + www) must be in that list.

---

## Step 4 — Update Supabase Auth URLs

Supabase → **Authentication → URL Configuration**:

1. **Site URL**: `https://hilgod.com`
2. **Redirect URLs** (allowlist) — add all of these:
   - `https://hilgod.com/**`
   - `https://www.hilgod.com/**`
   - keep `http://localhost:3000/**` for local dev

Without this, email-confirmation links, password-reset links, and OAuth callbacks will
fail with a redirect-not-allowed error after the domain switch.

---

## Step 5 — Update Google OAuth (only if Google login is enabled)

Google Cloud Console → **APIs & Services → Credentials → your OAuth 2.0 Client**:

1. **Authorized JavaScript origins**: add `https://hilgod.com` and `https://www.hilgod.com`.
2. **Authorized redirect URIs**: add the Supabase callback,
   `https://<your-project-ref>.supabase.co/auth/v1/callback` (this does not change with your
   domain, but verify it is present).

---

## Step 6 — Verify the sending domain in Resend (for email)

Emails are sent from `@hilgod.com`. Resend will only deliver from a **verified** domain.

1. Resend → **Domains → Add Domain** → `hilgod.com`.
2. Resend gives you DNS records — add them at your DNS host:
   - **SPF** (a `TXT` record),
   - **DKIM** (one or more `TXT`/`CNAME` records),
   - optionally a **MX**/return-path record for bounce handling.
3. Wait for Resend to show the domain **Verified**.
4. Confirm `RESEND_API_KEY` is set on the **backend** project.

> If the domain is not verified, `sendEmail()` logs the failure to the `email_logs` table
> and the message is silently dropped — orders still succeed, but no email goes out.

---

## Step 7 — Redeploy both projects

Env-var and rewrite changes only apply to a fresh build.

- Trigger a redeploy of **both** the frontend and backend projects (Vercel → Deployments →
  Redeploy, or push a commit).
- Because this project's deploy flow removes `.git` during `vercel deploy`, make sure the
  repo is restored afterward (see the project's deploy notes).

---

## Step 8 — Verify end to end

- [ ] `https://hilgod.com` loads the storefront over HTTPS (valid padlock).
- [ ] `https://www.hilgod.com` redirects to the primary domain.
- [ ] Products load (confirms the `/api/*` rewrite reaches the backend and CORS passes).
- [ ] Sign up → receive the confirmation email → the link returns to `hilgod.com` and logs you in.
- [ ] Password reset email link works.
- [ ] Google login (if enabled) completes and lands back on `hilgod.com`.
- [ ] Place a test order → buyer/seller/admin emails arrive from `@hilgod.com`.
- [ ] In the browser devtools Network tab, API calls go to `hilgod.com/api/...` (proxied),
      with no CORS errors in the console.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Products don't load, console shows CORS error | `FRONTEND_URL` on backend missing the new host | Add apex + www to `FRONTEND_URL`, redeploy backend |
| API calls 404 / hit the wrong host | `NEXT_PUBLIC_API_URL` wrong or missing `/api` | Set it to `https://api.hilgod.com/api`, redeploy frontend |
| Auth/reset/OAuth link says redirect not allowed | Supabase redirect allowlist or Site URL not updated | Add `https://hilgod.com/**` and `https://www.hilgod.com/**` |
| Domain stuck "Invalid Configuration" in Vercel | DNS not propagated or wrong record type | Re-check A/CNAME values; wait for propagation; use `dig`/`nslookup` to confirm |
| Emails not arriving | Resend domain unverified or `RESEND_API_KEY` missing | Verify domain in Resend; check the `email_logs` table for the failure reason |
| Mixed `www`/apex cookie/session issues | Two primary hosts with no redirect | Pick one primary in Vercel; let the other 308-redirect |

---

## Quick reference — what each var controls

- `NEXT_PUBLIC_API_URL` (frontend) → where the browser's `/api/*` calls get proxied.
- `FRONTEND_URL` (backend) → CORS allowlist **and** the base URL in every transactional email link.
- Supabase **Site URL / Redirect URLs** → where auth links and OAuth callbacks may return.
- Resend **verified domain** → whether `@hilgod.com` email actually sends.
