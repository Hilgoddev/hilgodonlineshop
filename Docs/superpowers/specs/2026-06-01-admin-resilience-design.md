# Admin/Auth Resilience + Query-Source Fix + Cosmetic Cleanup

**Date:** 2026-06-01
**Status:** Approved — ready for implementation plan

## Problem

Every admin/seller data endpoint returns **500** under Supabase free-tier load. Browser
logs show a consistent failure shape:

- Admin data routes 500 at a hard **~30,000ms** ceiling — this is the Vercel serverless
  function timeout. The Supabase query never returns in time, so the platform hard-kills
  the function and the client sees a 500.
  - `/api/admin/stats`, `/api/admin/customers`, `/api/orders/all`,
    `/api/products/all?limit=1000`
- `verifyToken`-gated routes 500 **or** 401 at **~10,000ms** — the
  `supabase.auth.getUser(token)` call inside `verifyToken` stalls; on timeout it is
  treated as "no valid user" → 401, or it surfaces as an unhandled 500.
  - `/api/auth/me`, occasional `/api/products/all`

### Root cause

Supabase free-tier compute is the bottleneck. Query latency swings wildly (5s → 90s+)
independent of row count — a `limit=1` query has been observed taking 9s. The application
layer makes this worse:

1. **No timeouts.** Routes await Supabase with no `AbortController`, so a slow query rides
   the request until the platform's 30s ceiling kills it (500) rather than failing fast
   with a graceful response.
2. **No caching.** Every admin page load re-runs the same expensive queries cold.
3. **Oversized queries.**
   - `/products/all?limit=1000` pulls the entire catalog + 3 joins for client-side
     filtering.
   - `admin.js /stats` fires **7 parallel queries** plus
     `supabase.auth.admin.listUsers({ perPage: 1000 })`.
   - `/customers` and `/sellers` each *also* call `listUsers({ perPage: 1000 })` — the
     same heavy auth-admin fetch recomputed on three routes.

The public `/api/products` route was already hardened in a prior session (cache +
abort-timeout + single-flight + stale-while-revalidate). This spec generalizes that
pattern and fixes the query cost at the source.

## Scope (approved)

"Also clean cosmetic noise" + "full server-side" pagination. Three parts:

A. Resilience layer on all admin/auth read endpoints.
B. Query-source fix: server-side pagination/filtering for products routes + DB indexes.
C. Cosmetic cleanup (Bucket B).

Out of scope: Supabase compute upgrade (user billing decision); Chrome-extension console
noise (not our code); mutation routes (POST/PUT/DELETE stay untouched — reads only).

## Design

### 1. Shared resilience library — `backend/src/lib/resilience.js`

Extract the primitives already proven in `products.js` into one reusable module:

- `withTimeout(buildQuery, ms)` — runs a supabase query builder with an `AbortController`;
  rejects on timeout. Timeout must fire **before** the 30s platform ceiling — default
  **8000ms** for auth, **12000ms** for data routes.
- `makeCache({ ttlMs })` → `{ get(key), set(key, value), }` — Map-based in-memory TTL cache.
- `singleFlight()` — coalesces concurrent callers on the same key into one in-flight promise.
- `getEmailMap()` — cached wrapper around `supabase.auth.admin.listUsers({ perPage: 1000 })`,
  TTL ~60s, single-flighted. Replaces the three duplicate calls in `/stats`, `/customers`,
  `/sellers`.

`products.js` is refactored to import these instead of its local copies (behavior-neutral
dedup).

**Graceful-failure contract:** on timeout or transient query error, a read route returns:
- cached payload if available (stale-while-revalidate), else
- an empty-but-valid payload (`{ success: true, data: [], pagination: {...} }`) with
  `Cache-Control: no-store`, or
- **503** for auth where an empty list is not meaningful.

Routes never emit an unhandled 500 for transient DB slowness.

### 2. `verifyToken` hardening — `auth.js`

Wrap `supabase.auth.getUser(token)` in `withTimeout(~8000ms)`.
- Genuine missing/invalid token → **401** (unchanged).
- Timeout / transient error → **503** `{ error: 'auth temporarily unavailable' }` (not a
  silent 401 and not an unhandled 500).

This stops the cascade where DB saturation makes authentication itself fail.

### 3. `/auth/me` and the admin list/stats routes

Apply `withTimeout` + short-TTL cache (+ single-flight where read-heavy) to:

- `auth.js`: `/me` — wrap `profiles` query; ~30s per-user cache; on failure serve cached
  profile if present else 503.
- `admin.js`: `/stats` (~30s cache), `/customers`, `/sellers`, `/seller-applications`,
  `/riders` — wrap queries, use `getEmailMap()`, cache list payloads ~30s.
- `orders.js`: `/all` — wrap + cache ~30s.
- `stores.js`: `/all` — wrap + cache ~30s + single-flight; drop debug `console.log` lines.

### 4. Server-side pagination — products routes + frontend

DB does filtering/sorting/pagination; routes return only the current page (~20–50 rows).

- `products.js` `/` (public): ensure `category/subcategory/search/sort` map to DB-level
  `.eq()/.ilike()/.order()/.range()`; select only card columns; `count: 'estimated'`.
- `products.js` `/all` (admin): same — `.range((page-1)*limit, ...)`, server-side filter
  params, cache + timeout via shared lib.

Frontend:
- `frontend/pages/products/index.js`: stop fetching `limit=1000`; fetch
  `?page=N&limit=20&category=&search=&sort=`; drive sort/filter via query params; render
  `meta.pagination` from server; remove the client-side filter/sort/slice block.
- `frontend/pages/admin/products.js`: paged fetch instead of full-catalog pull.

DB indexes (delivered as a `.sql` migration to run manually in Supabase SQL editor, like
migration 005): `products.category`, `products.subcategory`, `products.seller_id`,
`products.created_at`, and a search index on `products.name` (btree or trgm).

### 5. Cosmetic (Bucket B)

1. **favicon 404** — add missing `frontend/public/assets/favicon.svg` (or repoint the
   `<link href>` to an existing asset).
2. **next/head stylesheets** — move Google Fonts + FontAwesome `<link rel="stylesheet">`
   from `AdminLayout.js` into `frontend/pages/_document.js`.
3. **scroll-behavior warning** — add `data-scroll-behavior="smooth"` to `<html>` in
   `_document.js`.
4. **ipwho.is 403** — wrap the geo lookup in `CurrencyContext.js` in try/catch with a sane
   default-currency fallback; no console error spam.

Not touched (benign / external): Chrome-extension logs, `__cf_bm` cookie rejections from
the Supabase storage image CDN, `_clientMiddlewareManifest.js` MIME notice, source-map 404s.

## Testing / verification

- Warm cache serves admin routes in < 1s; cold miss returns within the timeout, never a
  30s 500.
- Concurrent identical requests coalesce (single-flight) — one DB query, not N.
- `verifyToken` returns 401 for a bad token and 503 (not 500) when `getUser` times out.
- `/products` and `/products/all` return one page of rows; pagination metadata correct;
  listing page filters/sorts via query params.
- Cosmetic: no favicon 404, no next/head stylesheet warning, no scroll-behavior warning,
  no ipwho.is console error.

## Constraints (from project memory — must hold)

- Push only to `client` remote; never `origin`.
- No `Co-Authored-By` line in commits.
- `deploy.ps1` renames `.git` during deploy — restore after; never commit during deploy.
- `SUPABASE_SERVICE_ROLE_KEY` must never reach the frontend.
- Do not run `-SyncEnv` (local env has localhost values that would clobber prod).
- Migration `.sql` files are run manually by the user in Supabase.
