# Auth & OAuth Setup for the Custom Domain (hilgod.com)

Concrete, copy-paste configuration for everything identity-related after the domains are
live. Domains `hilgod.com`, `www.hilgod.com` (frontend) and `api.hilgod.com` (backend) are
already verified — see `CUSTOM_DOMAIN_SETUP.md` for the domain/DNS side.

**Project facts**
- Supabase project ref: `nmrqdzikceakkhfhflja`
- Supabase URL: `https://nmrqdzikceakkhfhflja.supabase.co`
- Frontend: `https://hilgod.com` (apex, primary) + `https://www.hilgod.com`
- Backend API: `https://api.hilgod.com/api`
- Email: Resend, sending from `@hilgod.com`

> After ANY env-var change on Vercel, you must **redeploy** that project — Vercel does not
> hot-reload env vars.

---

## 1. Supabase — Auth URL Configuration

Dashboard → **Authentication → URL Configuration**

| Field | Value |
|---|---|
| **Site URL** | `https://hilgod.com` |
| **Redirect URLs** (add each) | `https://hilgod.com/**` |
| | `https://www.hilgod.com/**` |
| | `http://localhost:3000/**` (keep for local dev) |

Why: the confirmation / password-reset / magic-link / OAuth links Supabase emails out are
built from **Site URL**, and Supabase refuses any post-auth redirect not in the allowlist.
Without this, every auth email link fails with "redirect not allowed" after the domain switch.

---

## 2. Supabase — Branded email templates

Dashboard → **Authentication → Emails → Templates**. Paste the matching HTML from
`backend/email-templates/` into each template's **Message body** (keep the `{{ ... }}`
variables intact). See `backend/email-templates/README.md` for the file → template map and
suggested subjects:

- Confirm signup · Invite user · Magic Link · Change Email Address · Reset Password ·
  Reauthentication · Password changed

---

## 3. Google OAuth (only if Google login is enabled)

### 3a. Google Cloud Console → APIs & Services → Credentials → your OAuth 2.0 Client ID

| Setting | Add these values |
|---|---|
| **Authorized JavaScript origins** | `https://hilgod.com` |
| | `https://www.hilgod.com` |
| | `http://localhost:3000` (local dev) |
| **Authorized redirect URIs** | `https://nmrqdzikceakkhfhflja.supabase.co/auth/v1/callback` |

> The redirect URI points at **Supabase** (not your domain) and does **not** change when you
> add a custom site domain. Just confirm it's present. If you later set up a Supabase vanity
> auth domain (Section 6), add that domain's `/auth/v1/callback` here too.

### 3b. Google OAuth consent screen
- Ensure the app is **Published** (not just "Testing") so any user can sign in.
- App domain / homepage: `https://hilgod.com`; privacy policy `https://hilgod.com/privacy`;
  terms `https://hilgod.com/terms`.

### 3c. Supabase → Authentication → Providers → Google
- **Enabled** = on.
- **Client ID** and **Client Secret** = the values from the Google OAuth client above.
- The "Callback URL (for OAuth)" shown here is
  `https://nmrqdzikceakkhfhflja.supabase.co/auth/v1/callback` — it must match 3a.

---

## 4. Frontend — Vercel env (then redeploy frontend)

Vercel → **frontend** project → Settings → Environment Variables

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://api.hilgod.com/api` (note the trailing `/api`) |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://nmrqdzikceakkhfhflja.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | (the project's anon/publishable key) |

> The browser only calls the same-origin `/api/*` path; Next.js proxies it to
> `NEXT_PUBLIC_API_URL`, so there's no cross-origin call from the browser to the API host.
> Never put the service-role key in a `NEXT_PUBLIC_` var.

---

## 5. Backend — Vercel env (then redeploy backend)

Vercel → **backend** project → Settings → Environment Variables

| Variable | Value | Purpose |
|---|---|---|
| `FRONTEND_URL` | `https://hilgod.com,https://www.hilgod.com` | CORS allowlist (comma-separated, no trailing slash) **and** the base URL in email links |
| `SUPABASE_URL` | `https://nmrqdzikceakkhfhflja.supabase.co` | DB/auth admin |
| `SUPABASE_SERVICE_ROLE_KEY` | (service-role secret — never expose) | server-side DB access |
| `SUPABASE_ANON_KEY` | (anon key) | password-grant verification |
| `RESEND_API_KEY` | (Resend key) | sending email |
| `EMAIL_FROM_ORDERS` | `Hilgod Orders <order@hilgod.com>` | order emails |
| `EMAIL_FROM_NOREPLY` | `Hilgod <noreply@hilgod.com>` | other emails |
| `ADMIN_EMAIL` | (admin inbox) | new-order/admin alerts |

CORS lives in `backend/src/index.js` (splits `FRONTEND_URL` on commas), so **every** front
host (apex + www) must be listed.

---

## 6. Resend — verify the sending domain

Resend → **Domains** → `hilgod.com` must show **Verified** (SPF + DKIM TXT/CNAME records at
your DNS host). If unverified, `sendEmail()` logs the failure to the `email_logs` table and
silently drops the message — orders still succeed but no email goes out. Also confirm
`order@hilgod.com` / `noreply@hilgod.com` work on the verified domain.

---

## 7. (Optional) Supabase vanity auth domain — e.g. `auth.hilgod.com`

Currently **not configured** — `SUPABASE_URL` is the default `…supabase.co`, so auth/verify
links in emails show `nmrqdzikceakkhfhflja.supabase.co`. This is cosmetic only.

To use a branded auth domain (requires the Supabase **Custom Domains** Pro add-on):
1. Supabase → **Settings → Custom Domains** (or via CLI `supabase domains create/activate`).
2. Add the CNAME it gives you (e.g. `auth.hilgod.com` → `…supabase.co`) at your DNS host.
3. Activate; Supabase issues the cert.
4. Then update **everywhere** that references the project URL: `SUPABASE_URL` /
   `NEXT_PUBLIC_SUPABASE_URL` (both Vercel projects) → `https://auth.hilgod.com`, and add
   `https://auth.hilgod.com/auth/v1/callback` to the Google OAuth redirect URIs (3a).

---

## 8. Verify end-to-end (after redeploys)

- [ ] `https://hilgod.com` loads over HTTPS; `www` 308-redirects to it.
- [ ] Products load (confirms `/api/*` rewrite → `api.hilgod.com` and CORS pass).
- [ ] Sign up → confirmation email arrives (branded) → link returns to `hilgod.com` and logs in.
- [ ] Password-reset email link works.
- [ ] Google login (if enabled) completes and lands back on `hilgod.com`.
- [ ] Place a test order → buyer/seller/admin emails arrive from `@hilgod.com`.
- [ ] DevTools → Network: API calls go to `hilgod.com/api/...` (proxied), no CORS errors.

---

## Quick reference — what each setting controls

| Setting | Controls |
|---|---|
| Supabase **Site URL / Redirect URLs** | Where auth email links + OAuth callbacks may return |
| Google **origins / redirect URIs** | Whether Google sign-in is allowed from your domain |
| Frontend `NEXT_PUBLIC_API_URL` | Where the browser's `/api/*` calls are proxied |
| Backend `FRONTEND_URL` | CORS allowlist + base URL in every transactional email link |
| Resend **verified domain** | Whether `@hilgod.com` email actually sends |
