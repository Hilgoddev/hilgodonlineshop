# Cleanup & Security Report — Hilgod Online Shop
**Date:** 2026-06-20 · **Scope:** secret remediation, ownership, database cleanup, Supabase advisor fixes
**Status:** core work complete; a few owner-only items remain (see *Outstanding*).

> No actual secret values are included in this document.

---

## 1. Secret remediation

### Found (committed to the `client` repo)
| Secret | Location | In git history |
|--------|----------|----------------|
| Supabase `service_role` key | hardcoded in `scripts/seed_techmart.js` | yes (commit `133718b`) |
| Google OAuth client secret | `Docs/TROUBLESHOOTING.md` | yes (commit `a7d367b`) |
| MongoDB URI + password (legacy) | `Docs/TROUBLESHOOTING.md` | yes |
| NextAuth secret (legacy) | `Docs/TROUBLESHOOTING.md` | yes |

Stripe / Paystack / Resend / CurrencyFreaks / ExchangeRate keys were **never committed** (only in gitignored `backend/.env`) — safe.

### Done
- Working tree scrubbed: `seed_techmart.js` now reads `process.env`; doc secrets replaced with placeholders.
- Committed (`af4b51c`).
- **Git history rewritten** with `git filter-repo` (main branch only — `production` contained none of the secrets), all 4 values replaced, force-pushed to `client/main` (`133718b` → `67f316f`). Old commits purged locally.
- Safety backup bundle: `Downloads/hilgod-pre-scrub-2026-06-19.bundle` (contains old history — delete after key rotation).

### ⚠️ Outstanding (owner-only)
- **Rotate the 4 leaked keys.** History scrubbing does NOT invalidate them, and GitHub may retain old commits by SHA for a while. Rotate in Supabase (service_role), Google Cloud (OAuth secret), MongoDB Atlas (or decommission the dead cluster), and NextAuth. Update `backend/.env` + Vercel env vars after.

---

## 2. Ownership & identity
- **No third-party collaborator** exists in code or git history (searched for "lonecoda" etc. — none). All commits are the developer's own two emails.
- Project ownership now declared in code: `backend/package.json` & `frontend/package.json` set to `author: "Hilgod"`, `license: "UNLICENSED"`, `private: true`. Frontend package name corrected (`…-backend` → `hilgod-onlineshop-frontend`).
- Developer's personal name appears only in `REPORT.md` and `SECURITY_AUDIT.md` (not over-populated; genericize on handover if desired).
- **Platform** collaborators (GitHub repo, Vercel team `hilgoddevs-projects`, Supabase org) must be reviewed in each dashboard — could not be enumerated from here.

---

## 3. Database cleanup (Supabase)

### Backups taken first (local, gitignored)
- `backups/db-backup-2026-06-19/` — full DB export (products, profiles, auth users, stores, orders, etc.).
- `backups/db-backup-2026-06-20-pre-order-wipe/` — all orders + the removed account, pre-deletion.

### Removed
- **Test products:** `t-test`, `Accessories Test`, `Amin product upload` (+ their reviews). **0 test products remain.**
- **All orders wiped:** 27 orders + their `order_items` and `order_status_history` (cascade). **0 orders remain.** (`payment_events` rows kept, order link nulled.)
- **linuxrate (A A)** demo seller: 2 test orders cleared; kept the 5 "TechMart" demo products (by choice).
- **Account `akhigbeabdulwahab354@gmail.com`** (former admin): briefly demoted to seller, then **deleted** (auth user + profile).

### Result
- Sole admin: **`hilgoddev@gmail.com`** (client retains full access).
- Real seller/customer accounts, product catalog, categories, exchange rates — untouched.

---

## 4. Supabase advisor fixes (migrations)

Pulled the official advisors: **18 security findings → 3** after fixes.

### Migration `015_advisor_security_perf_fixes.sql` (applied)
- Pinned `search_path` on 6 functions (schema-qualified so behavior is unchanged).
- Revoked `anon`/`authenticated` EXECUTE on `increment_/decrement_product_stock` (kept `service_role` — backend still works).
- Added 13 missing foreign-key indexes; dropped 1 duplicate index on `stores`.
- Added admin-scoped RLS policies to 4 policy-less tables (`flash_sales`, `rider_applications`, `newsletter_subscribers`, `platform_settings`).

### Migration `016_tighten_return_requests_rls.sql` (applied)
- Removed an `INSERT WITH CHECK (true)` policy that let anyone bypass the backend and write `return_requests` directly. Returns now flow only through the authenticated `POST /api/returns` route. Added an admin-manage policy.

### Migration `017_restrict_product_images_listing.sql` (written, NOT applied)
- Would drop the public listing policy on the `product-images` bucket (images still load by URL). Blocked by the local safety guard; apply via the Supabase dashboard (Storage → Policies → delete "Public can read product images") or re-run.

### Remaining advisor items
- `extension_in_public` (pg_trgm) — low priority; moving it touches the search index.
- `public_bucket_allows_listing` — finish via migration 017 (above).
- `auth_leaked_password_protection` — enable in Dashboard → Authentication → Policies (1 click).
- Performance refactor (separate migration): `auth_rls_initplan` (38) + `multiple_permissive_policies` (45). `unused_index` (16) is informational — leave.

---

## 5. Files created (in repo, NOT yet committed)
- `backend/supabase/migrations/015_advisor_security_perf_fixes.sql`
- `backend/supabase/migrations/016_tighten_return_requests_rls.sql`
- `backend/supabase/migrations/017_restrict_product_images_listing.sql`
- `Docs/CLEANUP_AND_SECURITY_REPORT_2026-06-20.md` (this file)

---

## 6. Outstanding / next steps
1. **Rotate the 4 leaked keys** (highest priority).
2. Apply **migration 017 / #3** (dashboard or retry).
3. Enable **leaked-password protection** (dashboard).
4. **Commit** migrations 015/016/017 (and this report) when ready — pushing triggers a Vercel deploy.
5. Optional: performance RLS refactor; move `pg_trgm`; genericize developer name in `REPORT.md`/`SECURITY_AUDIT.md`.
6. Review **platform collaborators** (GitHub / Vercel / Supabase dashboards).
7. After rotation, **delete** `Downloads/hilgod-pre-scrub-2026-06-19.bundle` (contains old secrets).
