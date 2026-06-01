# Admin/Auth Resilience + Query-Source Fix + Cosmetic Cleanup — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop every admin/auth endpoint from returning 500 under Supabase free-tier load, cut the cost of the products queries at the source, and clear the cosmetic console noise.

**Architecture:** Extract the cache + abort-timeout + single-flight pattern already proven in `products.js` into a shared `backend/src/lib/resilience.js`, then apply it to every admin/auth *read* route so a slow query degrades to a graceful (cached or empty) response instead of riding the 30s platform timeout into a 500. Make the products list/admin routes return one page of rows (DB-side filter/sort/paginate) instead of the whole catalog. Fix four cosmetic frontend issues.

**Tech Stack:** Node/Express, supabase-js (PostgREST over HTTP), Next.js Pages Router, Jest + Supertest (added for the lib unit tests).

**Testing note:** The pure resilience primitives (`withTimeout`, `makeCache`, `singleFlight`) are unit-tested with Jest (no DB needed) — real TDD. Route changes depend on live Supabase + auth tokens, so they use **manual smoke verification** against the running dev server (`npm run dev` in `backend/`, listening on `:5000`). Fabricating Supabase mocks for every route would be brittle and is out of scope.

**Project constraints (must hold):** push only to `client` remote, never `origin`; no `Co-Authored-By` line in commits; never run `deploy.ps1` / `-SyncEnv` as part of this work; `SUPABASE_SERVICE_ROLE_KEY` stays server-side; migration `.sql` files are run manually by the user in Supabase.

---

## File Structure

**Created:**
- `backend/src/lib/resilience.js` — shared primitives: `withTimeout`, `makeCache`, `singleFlight`, `getEmailMap`.
- `backend/tests/resilience.test.js` — Jest unit tests for the pure primitives.
- `backend/migrations/006_product_indexes.sql` — DB indexes for products filter/sort columns (run manually).

**Modified (backend):**
- `backend/package.json` — add Jest devDep + `test` script.
- `backend/src/routes/products.js` — refactor to import shared lib; paginate + protect `/all`.
- `backend/src/routes/auth.js` — timeout-harden `verifyToken`; cache + protect `/me`.
- `backend/src/routes/admin.js` — protect `/stats`, `/customers`, `/sellers`, `/seller-applications`, `/riders`; dedupe email lookups via `getEmailMap`.
- `backend/src/routes/orders.js` — protect `/all`.
- `backend/src/routes/stores.js` — protect `/all`; drop debug `console.log` lines.

**Modified (frontend):**
- `frontend/pages/products/index.js` — server-side category/subcategory/sort/pagination; drop `limit=1000`/`250` full fetch.
- `frontend/pages/admin/products.js` — request a capped page instead of `limit=1000`.
- `frontend/components/admin/AdminLayout.js` — remove duplicate `next/head` stylesheet + favicon links (fixes the favicon 404 *and* both stylesheet warnings).
- `frontend/pages/_document.js` — add `data-scroll-behavior="smooth"` to `<Html>`.
- `frontend/contexts/CurrencyContext.js` — call `ipwho.is` only as a sequential fallback so the 403 stops spamming the console.

---

## Task 1: Shared resilience library (TDD)

**Files:**
- Create: `backend/src/lib/resilience.js`
- Test: `backend/tests/resilience.test.js`
- Modify: `backend/package.json`

- [ ] **Step 1: Add Jest to package.json**

Edit `backend/package.json` — replace the `test` script and add a `devDependencies` block:

```json
  "scripts": {
    "start": "node src/index.js",
    "dev": "node --watch src/index.js",
    "test": "jest",
    "verify:supabase": "node scripts/verify-supabase-setup.js",
    "seed:static-products": "node scripts/seed-products-from-static.js",
    "update:rates": "node scripts/update-exchange-rates.js"
  },
  "devDependencies": {
    "jest": "^29.7.0",
    "supertest": "^7.0.0"
  }
```

- [ ] **Step 2: Install dev dependencies**

Run: `cd backend && npm install`
Expected: `jest` and `supertest` appear under `node_modules`; exit 0.

- [ ] **Step 3: Write the failing tests**

Create `backend/tests/resilience.test.js`:

```js
const { withTimeout, makeCache, singleFlight } = require('../src/lib/resilience');

describe('withTimeout', () => {
  it('resolves when the run function resolves in time', async () => {
    const result = await withTimeout(() => Promise.resolve('ok'), 50);
    expect(result).toBe('ok');
  });

  it('rejects when the run function exceeds the timeout', async () => {
    await expect(
      withTimeout(() => new Promise((r) => setTimeout(() => r('late'), 100)), 20)
    ).rejects.toThrow(/timed out/);
  });

  it('passes an AbortSignal to the run function', async () => {
    let received;
    await withTimeout((signal) => { received = signal; return Promise.resolve(1); }, 50);
    expect(received).toBeInstanceOf(AbortSignal);
  });

  it('aborts the signal on timeout', async () => {
    let signal;
    await expect(
      withTimeout((s) => { signal = s; return new Promise((r) => setTimeout(r, 100)); }, 20)
    ).rejects.toThrow();
    expect(signal.aborted).toBe(true);
  });
});

describe('makeCache', () => {
  it('returns undefined for a missing key', () => {
    const cache = makeCache({ ttlMs: 1000 });
    expect(cache.get('nope')).toBeUndefined();
  });

  it('returns a fresh entry within ttl', () => {
    const cache = makeCache({ ttlMs: 1000 });
    cache.set('k', 42);
    const hit = cache.get('k');
    expect(hit.value).toBe(42);
    expect(hit.fresh).toBe(true);
  });

  it('marks an entry stale after ttl but still returns the value', () => {
    const cache = makeCache({ ttlMs: -1 }); // already expired
    cache.set('k', 'v');
    const hit = cache.get('k');
    expect(hit.value).toBe('v');
    expect(hit.fresh).toBe(false);
  });
});

describe('singleFlight', () => {
  it('coalesces concurrent calls for the same key into one execution', async () => {
    const run = singleFlight();
    let calls = 0;
    const fn = () => { calls += 1; return new Promise((r) => setTimeout(() => r('done'), 20)); };
    const [a, b] = await Promise.all([run('key', fn), run('key', fn)]);
    expect(a).toBe('done');
    expect(b).toBe('done');
    expect(calls).toBe(1);
  });

  it('runs again after the in-flight promise settles', async () => {
    const run = singleFlight();
    let calls = 0;
    const fn = () => { calls += 1; return Promise.resolve('x'); };
    await run('key', fn);
    await run('key', fn);
    expect(calls).toBe(2);
  });
});
```

- [ ] **Step 4: Run tests to verify they fail**

Run: `cd backend && npm test`
Expected: FAIL — `Cannot find module '../src/lib/resilience'`.

- [ ] **Step 5: Implement the library**

Create `backend/src/lib/resilience.js`:

```js
const supabase = require('../config/supabase');

// Run an async function with a hard timeout. `run` receives an AbortSignal so
// supabase queries can pass it to `.abortSignal(signal)` and be cancelled when
// the deadline hits. Rejects with a timeout Error if `run` doesn't settle first.
function withTimeout(run, timeoutMs) {
    const ac = new AbortController();
    let timer;
    const timeout = new Promise((_, reject) => {
        timer = setTimeout(() => {
            ac.abort();
            reject(new Error(`query timed out after ${timeoutMs}ms`));
        }, timeoutMs);
    });
    return Promise.race([Promise.resolve().then(() => run(ac.signal)), timeout])
        .finally(() => clearTimeout(timer));
}

// Tiny in-memory TTL cache. get() returns { value, fresh } or undefined.
// Stale entries are still returned (fresh:false) so callers can serve stale
// data while a background refresh runs.
function makeCache({ ttlMs }) {
    const store = new Map();
    return {
        get(key) {
            const e = store.get(key);
            if (!e) return undefined;
            return { value: e.value, fresh: e.freshUntil > Date.now() };
        },
        set(key, value) {
            store.set(key, { value, freshUntil: Date.now() + ttlMs });
        },
        delete(key) { store.delete(key); },
    };
}

// Coalesce concurrent callers on the same key into one in-flight promise.
function singleFlight() {
    const inflight = new Map();
    return function run(key, fn) {
        if (inflight.has(key)) return inflight.get(key);
        const p = Promise.resolve().then(fn).finally(() => inflight.delete(key));
        inflight.set(key, p);
        return p;
    };
}

// Cached, single-flighted wrapper around the expensive
// supabase.auth.admin.listUsers call. /stats, /customers and /sellers all need
// the same id->email map; this computes it at most once per TTL.
const emailMapCache = makeCache({ ttlMs: 60 * 1000 });
const emailFlight = singleFlight();
async function getEmailMap() {
    const cached = emailMapCache.get('all');
    if (cached && cached.fresh) return cached.value;
    try {
        const map = await emailFlight('all', async () => {
            const { data } = await withTimeout(
                () => supabase.auth.admin.listUsers({ perPage: 1000 }),
                12 * 1000,
            );
            return new Map((data?.users || []).map((u) => [u.id, u.email]));
        });
        emailMapCache.set('all', map);
        return map;
    } catch (err) {
        console.error('getEmailMap failed:', err?.message || err);
        if (cached) return cached.value; // serve stale rather than nothing
        return new Map();
    }
}

module.exports = { withTimeout, makeCache, singleFlight, getEmailMap };
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd backend && npm test`
Expected: PASS — all 10 tests green.

- [ ] **Step 7: Commit**

```bash
git add backend/package.json backend/package-lock.json backend/src/lib/resilience.js backend/tests/resilience.test.js
git commit -m "Add shared resilience lib (timeout, cache, single-flight, email map)"
```

---

## Task 2: Harden verifyToken (auth.js)

**Files:**
- Modify: `backend/src/routes/auth.js:6-21`

- [ ] **Step 1: Add the import**

At the top of `backend/src/routes/auth.js`, after line 3 (`const supabase = require('../config/supabase');`), add:

```js
const { withTimeout } = require('../lib/resilience');
```

- [ ] **Step 2: Replace the verifyToken body**

Replace lines 6-21 (the current `verifyToken`) with:

```js
const verifyToken = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, message: 'No token provided' });
    }

    let user, error;
    try {
        ({ data: { user } = {}, error } = await withTimeout(
            () => supabase.auth.getUser(token),
            8 * 1000,
        ));
    } catch (e) {
        // Timeout / transient outage — NOT an auth failure. Tell the client to
        // retry instead of masquerading as 401 (bad token) or 500 (our bug).
        return res.status(503).json({ success: false, message: 'Auth temporarily unavailable' });
    }

    if (error || !user) {
        return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    req.user = user;
    next();
};
```

- [ ] **Step 3: Manual smoke — bad token still 401**

Start the backend (`cd backend && npm run dev`), then run:

PowerShell:
```powershell
try { Invoke-WebRequest -Uri http://localhost:5000/api/auth/me -Headers @{ Authorization = 'Bearer not-a-real-token' } -UseBasicParsing } catch { $_.Exception.Response.StatusCode.value__ }
```
Expected: `401`.

- [ ] **Step 4: Manual smoke — no token still 401**

```powershell
try { Invoke-WebRequest -Uri http://localhost:5000/api/auth/me -UseBasicParsing } catch { $_.Exception.Response.StatusCode.value__ }
```
Expected: `401`.

- [ ] **Step 5: Commit**

```bash
git add backend/src/routes/auth.js
git commit -m "Timeout-harden verifyToken: return 503 (not 500/401) on auth DB stall"
```

---

## Task 3: Protect /auth/me (auth.js)

**Files:**
- Modify: `backend/src/routes/auth.js:102-117`

- [ ] **Step 1: Add a per-user profile cache near the top of the file**

Below the `const { withTimeout } = ...` import added in Task 2, add:

```js
const { makeCache } = require('../lib/resilience');
const meCache = makeCache({ ttlMs: 30 * 1000 });
```

(Combine with the Task 2 import line if preferred: `const { withTimeout, makeCache } = require('../lib/resilience');` and a separate `const meCache = ...` line.)

- [ ] **Step 2: Replace the /me handler body**

Replace lines 102-117 (the current `router.get('/me', ...)`) with:

```js
router.get('/me', verifyToken, async (req, res, next) => {
    const cacheKey = req.user.id;
    try {
        const { data: profile, error } = await withTimeout(
            (signal) => supabase.from('profiles').select('*').eq('id', req.user.id).maybeSingle().abortSignal(signal),
            8 * 1000,
        );
        if (error) throw error;
        if (!profile) return res.status(404).json({ success: false, data: null, message: 'Profile not found' });

        meCache.set(cacheKey, profile);
        res.status(200).json({ success: true, data: profile });
    } catch (err) {
        // Serve a recently cached profile rather than 500 on a transient stall.
        const cached = meCache.get(cacheKey);
        if (cached) return res.status(200).json({ success: true, data: cached.value, stale: true });
        return res.status(503).json({ success: false, message: 'Profile temporarily unavailable' });
    }
});
```

- [ ] **Step 3: Manual smoke — authenticated /me returns the profile**

With a valid bearer token (grab one from the browser devtools `localStorage`/network tab on a logged-in session), run:
```powershell
$t = '<paste a valid supabase access token>'
(Invoke-WebRequest -Uri http://localhost:5000/api/auth/me -Headers @{ Authorization = "Bearer $t" } -UseBasicParsing).StatusCode
```
Expected: `200`. Run it twice — the second hit is served from cache (sub-second).

- [ ] **Step 4: Commit**

```bash
git add backend/src/routes/auth.js
git commit -m "Cache + timeout /auth/me: serve stale or 503 instead of 500"
```

---

## Task 4: Protect admin.js read routes + dedupe email lookups

**Files:**
- Modify: `backend/src/routes/admin.js` (imports; `/stats` 8-110; `/customers` 112-164; `/sellers` 166-225; `/seller-applications` 297-316; `/riders` 434-443)

- [ ] **Step 1: Add imports + caches**

After line 6 in `backend/src/routes/admin.js`, add:

```js
const { withTimeout, makeCache, getEmailMap } = require('../lib/resilience');
const statsCache = makeCache({ ttlMs: 30 * 1000 });
const listCache = makeCache({ ttlMs: 30 * 1000 });
```

- [ ] **Step 2: Wrap /stats with cache + graceful fallback**

In the `/stats` handler (line 8), at the very start of the `try` block (line 9), add a cache check:

```js
        const cached = statsCache.get('stats');
        if (cached && cached.fresh) return res.status(200).json(cached.value);
```

Replace the two `listUsers` blocks. The one at lines 65-68:

```js
        const emailMap = orderUserIds.length ? await getEmailMap() : new Map();
```
(delete the old `const { data: authData } = ...listUsers...` and `const emailMap = new Map((authData?.users...))` lines — `getEmailMap` returns the map directly.)

Then change the final success response so it caches before sending. Replace `res.status(200).json({` (line 72) with:

```js
        const payload = {
```
and replace the closing `});` of that response object (line 106) with:

```js
        };
        statsCache.set('stats', payload);
        return res.status(200).json(payload);
```

Finally, replace the `catch (err) { next(err); }` (lines 107-109) with:

```js
    } catch (err) {
        const cached = statsCache.get('stats');
        if (cached) return res.status(200).json({ ...cached.value, stale: true });
        console.error('admin /stats failed:', err?.message || err);
        return res.status(503).json({ success: false, error: 'Stats temporarily unavailable' });
    }
```

- [ ] **Step 3: Wrap /customers — cache + getEmailMap + graceful**

In `/customers` (line 112), after computing `offset` (line 116), add:

```js
        const cacheKey = `customers:${parsedPage}:${parsedLimit}`;
        const hit = listCache.get(cacheKey);
        if (hit && hit.fresh) return res.status(200).json(hit.value);
```

Replace the profiles query (lines 118-122) to use `withTimeout`:

```js
        const { data: profiles, error, count } = await withTimeout(
            (signal) => supabase
                .from('profiles')
                .select('*', { count: 'exact' })
                .order('created_at', { ascending: false })
                .range(offset, offset + parsedLimit - 1)
                .abortSignal(signal),
            12 * 1000,
        );
        if (error) throw error;
```

Replace the `listUsers` lines (131-132) with:

```js
        const emailMap = await getEmailMap();
```

Replace the final response (line 160) so it caches:

```js
        const payload = { success: true, data, pagination: { total: count || 0, page: parsedPage, limit: parsedLimit } };
        listCache.set(cacheKey, payload);
        return res.status(200).json(payload);
```

Replace the `catch` (lines 161-163) with:

```js
    } catch (err) {
        const hit = listCache.get(`customers:${Math.max(1, Number(req.query.page) || 1)}:${Math.min(100, Math.max(1, Number(req.query.limit) || 50))}`);
        if (hit) return res.status(200).json({ ...hit.value, stale: true });
        console.error('admin /customers failed:', err?.message || err);
        return res.status(503).json({ success: false, error: 'Customers temporarily unavailable' });
    }
```

- [ ] **Step 4: Wrap /sellers — same pattern**

In `/sellers` (line 166), after `offset` (line 170) add:

```js
        const cacheKey = `sellers:${parsedPage}:${parsedLimit}`;
        const hit = listCache.get(cacheKey);
        if (hit && hit.fresh) return res.status(200).json(hit.value);
```

Wrap the profiles query (lines 172-177) in `withTimeout` exactly like Step 3 but keeping the `.eq('role', 'seller')` filter:

```js
        const { data: profiles, error, count } = await withTimeout(
            (signal) => supabase
                .from('profiles')
                .select('*', { count: 'exact' })
                .eq('role', 'seller')
                .order('created_at', { ascending: false })
                .range(offset, offset + parsedLimit - 1)
                .abortSignal(signal),
            12 * 1000,
        );
        if (error) throw error;
```

Replace the `listUsers` lines (194-195) with `const emailMap = await getEmailMap();`.

Replace the final response (line 221) with:

```js
        const payload = { success: true, data, pagination: { total: count || 0, page: parsedPage, limit: parsedLimit } };
        listCache.set(cacheKey, payload);
        return res.status(200).json(payload);
```

Replace the `catch` (222-224) with:

```js
    } catch (err) {
        const hit = listCache.get(`sellers:${Math.max(1, Number(req.query.page) || 1)}:${Math.min(100, Math.max(1, Number(req.query.limit) || 50))}`);
        if (hit) return res.status(200).json({ ...hit.value, stale: true });
        console.error('admin /sellers failed:', err?.message || err);
        return res.status(503).json({ success: false, error: 'Sellers temporarily unavailable' });
    }
```

- [ ] **Step 5: Wrap /seller-applications and /riders queries in withTimeout**

In `/seller-applications` (line 297), replace `const { data, error } = await query;` (line 309) with:

```js
        const { data, error } = await withTimeout((signal) => query.abortSignal(signal), 12 * 1000);
```
and replace its `catch` (313-315) with:

```js
    } catch (err) {
        console.error('admin /seller-applications failed:', err?.message || err);
        return res.status(503).json({ success: false, error: 'Applications temporarily unavailable' });
    }
```

In `/riders` (line 434), replace `const { data, error } = await query;` (line 439) with:

```js
        const { data, error } = await withTimeout((signal) => query.abortSignal(signal), 12 * 1000);
```
and replace its `catch` (442) with:

```js
    } catch (err) {
        console.error('admin /riders failed:', err?.message || err);
        return res.status(503).json({ success: false, error: 'Riders temporarily unavailable' });
    }
```

- [ ] **Step 6: Manual smoke — admin routes return 200 (or 503), never 500**

With a valid **admin** bearer token:
```powershell
$t = '<admin token>'
foreach ($p in '/api/admin/stats','/api/admin/customers','/api/admin/sellers') {
  try { "$p -> " + (Invoke-WebRequest -Uri "http://localhost:5000$p" -Headers @{ Authorization = "Bearer $t" } -UseBasicParsing).StatusCode }
  catch { "$p -> " + $_.Exception.Response.StatusCode.value__ }
}
```
Expected: each prints `200`. Repeat immediately — second run is cache-fast.

- [ ] **Step 7: Commit**

```bash
git add backend/src/routes/admin.js
git commit -m "Protect admin read routes: cache + timeout + shared email map, graceful 503"
```

---

## Task 5: Protect orders.js /all

**Files:**
- Modify: `backend/src/routes/orders.js` (imports; `/all` 293-364)

- [ ] **Step 1: Add imports + cache**

After line 6 in `backend/src/routes/orders.js`, add:

```js
const { withTimeout, makeCache, getEmailMap } = require('../lib/resilience');
const ordersAllCache = makeCache({ ttlMs: 30 * 1000 });
```

- [ ] **Step 2: Add cache check + wrap the orders query**

In `/all` (line 293), after computing `offset` (line 300), add:

```js
        const cacheKey = `orders-all:${parsedPage}:${parsedLimit}`;
        const hit = ordersAllCache.get(cacheKey);
        if (hit && hit.fresh) return res.status(200).json(hit.value);
```

Replace the orders query (lines 302-306) with:

```js
        const { data: orders, error, count } = await withTimeout(
            (signal) => supabase
                .from('orders')
                .select('*', { count: 'exact' })
                .order('created_at', { ascending: false })
                .range(offset, offset + parsedLimit - 1)
                .abortSignal(signal),
            12 * 1000,
        );
        if (error) throw error;
```

- [ ] **Step 3: Cache the response + graceful catch**

Replace the final response (line 360) with:

```js
        const payload = { success: true, data, totalRevenue, pagination: { total: count || 0, page: parsedPage, limit: parsedLimit } };
        ordersAllCache.set(cacheKey, payload);
        return res.status(200).json(payload);
```

Replace the `catch` (361-363) with:

```js
    } catch (err) {
        const hit = ordersAllCache.get(`orders-all:${Math.max(1, Number(req.query.page) || 1)}:${Math.min(200, Math.max(1, Number(req.query.limit) || 50))}`);
        if (hit) return res.status(200).json({ ...hit.value, stale: true });
        console.error('orders /all failed:', err?.message || err);
        return res.status(503).json({ success: false, error: 'Orders temporarily unavailable' });
    }
```

- [ ] **Step 4: Manual smoke**

```powershell
$t = '<admin token>'
try { (Invoke-WebRequest -Uri "http://localhost:5000/api/orders/all" -Headers @{ Authorization = "Bearer $t" } -UseBasicParsing).StatusCode } catch { $_.Exception.Response.StatusCode.value__ }
```
Expected: `200`.

- [ ] **Step 5: Commit**

```bash
git add backend/src/routes/orders.js
git commit -m "Protect orders /all: cache + timeout + shared email map, graceful 503"
```

---

## Task 6: Protect stores.js /all + drop debug logs

**Files:**
- Modify: `backend/src/routes/stores.js` (imports near top; `/all` 62-96)

- [ ] **Step 1: Add imports + cache**

Near the other requires at the top of `backend/src/routes/stores.js`, add:

```js
const { withTimeout, makeCache, singleFlight } = require('../lib/resilience');
const storesAllCache = makeCache({ ttlMs: 30 * 1000 });
const storesFlight = singleFlight();
```

- [ ] **Step 2: Replace the /all handler**

Replace lines 63-96 (the whole `router.get('/all', ...)` handler) with:

```js
router.get('/all', verifyToken, requireAdmin, async (req, res, next) => {
    const cached = storesAllCache.get('all');
    if (cached && cached.fresh) return res.status(200).json(cached.value);

    try {
        const stores = await storesFlight('all', async () => {
            const { data, error } = await withTimeout(
                (signal) => supabase
                    .from('stores')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .abortSignal(signal),
                12 * 1000,
            );
            if (error) throw error;
            return data || [];
        });

        const data = stores.map((s) => ({
            id: s.id,
            name: s.name,
            slug: s.slug,
            status: s.status || (s.is_approved ? 'approved' : 'pending'),
            description: s.description,
            logo_url: s.logo_url,
            owner_id: s.owner_id,
            created_at: s.created_at,
            updated_at: s.updated_at,
        }));

        const payload = { success: true, data };
        storesAllCache.set('all', payload);
        return res.status(200).json(payload);
    } catch (err) {
        if (cached) return res.status(200).json({ ...cached.value, stale: true });
        console.error('stores /all failed:', err?.message || err);
        return res.status(503).json({ success: false, error: 'Stores temporarily unavailable' });
    }
});
```

- [ ] **Step 3: Manual smoke**

```powershell
$t = '<admin token>'
try { (Invoke-WebRequest -Uri "http://localhost:5000/api/stores/all" -Headers @{ Authorization = "Bearer $t" } -UseBasicParsing).StatusCode } catch { $_.Exception.Response.StatusCode.value__ }
```
Expected: `200`, and no `[stores.js /all]` debug lines in the server console.

- [ ] **Step 4: Commit**

```bash
git add backend/src/routes/stores.js
git commit -m "Protect stores /all: cache + timeout + single-flight; drop debug logs"
```

---

## Task 7: Paginate + protect products.js /all; refactor to shared lib

**Files:**
- Modify: `backend/src/routes/products.js` (imports 1-22; `/all` 260-285)

- [ ] **Step 1: Import the shared lib (de-dup the local copies)**

After line 5 in `backend/src/routes/products.js`, add:

```js
const { withTimeout, makeCache, getEmailMap } = require('../lib/resilience');
const allCache = makeCache({ ttlMs: 30 * 1000 });
```

(Leave the existing public-list cache machinery in lines 11-35 as-is for this task — it already works. This task only adds protection to `/all`. A later optional cleanup can route the public list through `makeCache` too, but that is not required and is out of scope here to avoid regressions.)

- [ ] **Step 2: Replace the /all handler with a paginated, protected version**

Replace lines 260-285 (the current `router.get('/all', ...)`) with:

```js
// GET /api/products/all  (admin — shows all including inactive). Paginated +
// cached + timeout-guarded so a slow free-tier query degrades gracefully.
router.get('/all', verifyToken, async (req, res, next) => {
    try {
        const { data: profile } = await withTimeout(
            (signal) => supabase.from('profiles').select('role').eq('id', req.user.id).single().abortSignal(signal),
            8 * 1000,
        );
        if (!profile || profile.role !== 'admin') return res.status(403).json({ success: false, error: 'Admin access required' });

        const parsedPage  = Math.max(1, Number(req.query.page)  || 1);
        const parsedLimit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
        const offset      = (parsedPage - 1) * parsedLimit;
        const search      = req.query.search || '';

        const cacheKey = `all:${parsedPage}:${parsedLimit}:${search}`;
        const hit = allCache.get(cacheKey);
        if (hit && hit.fresh) {
            res.setHeader('Cache-Control', 'private, no-cache, must-revalidate');
            return res.status(200).json(hit.value);
        }

        let q = supabase
            .from('products')
            .select('*, store:stores(name, slug, status), category_ref:categories(name, slug)', { count: 'estimated' })
            .order('created_at', { ascending: false });
        if (search) q = q.ilike('name', `%${search}%`);
        q = q.range(offset, offset + parsedLimit - 1);

        const { data, error, count } = await withTimeout((signal) => q.abortSignal(signal), 12 * 1000);
        if (error) throw error;

        let flashSaleMap = new Map();
        try { flashSaleMap = await getActiveFlashSaleMap((data || []).map((p) => p.id)); } catch {}

        const payload = {
            success: true,
            data: (data || []).map((p) => mapProduct(p, flashSaleMap.get(p.id))),
            pagination: { total: count || 0, page: parsedPage, limit: parsedLimit, pages: Math.ceil((count || 0) / parsedLimit) },
        };
        allCache.set(cacheKey, payload);
        res.setHeader('Cache-Control', 'private, no-cache, must-revalidate');
        return res.status(200).json(payload);
    } catch (err) {
        const parsedPage  = Math.max(1, Number(req.query.page)  || 1);
        const parsedLimit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
        const hit = allCache.get(`all:${parsedPage}:${parsedLimit}:${req.query.search || ''}`);
        if (hit) return res.status(200).json({ ...hit.value, stale: true });
        console.error('products /all failed:', err?.message || err);
        return res.status(503).json({ success: false, error: 'Products temporarily unavailable' });
    }
});
```

- [ ] **Step 3: Manual smoke — paginated admin products**

```powershell
$t = '<admin token>'
(Invoke-WebRequest -Uri "http://localhost:5000/api/products/all?page=1&limit=50" -Headers @{ Authorization = "Bearer $t" } -UseBasicParsing).Content | ConvertFrom-Json | Select-Object -ExpandProperty pagination
```
Expected: `total`, `page=1`, `limit=50`, `pages` printed; `data` length <= 50; status 200. Run the public list too to confirm no regression:
```powershell
(Invoke-WebRequest -Uri "http://localhost:5000/api/products?limit=20" -UseBasicParsing).StatusCode
```
Expected: `200`.

- [ ] **Step 4: Commit**

```bash
git add backend/src/routes/products.js
git commit -m "Paginate + protect products /all (cache, timeout, graceful 503)"
```

---

## Task 8: DB index migration (manual run)

**Files:**
- Create: `backend/migrations/006_product_indexes.sql`

- [ ] **Step 1: Write the migration**

Create `backend/migrations/006_product_indexes.sql`:

```sql
-- 006: Indexes for the hot products filter/sort columns.
-- The public list and admin /all filter by category/subcategory/seller_id and
-- the active+approved flags, and always sort by created_at. Without these the
-- free-tier DB does sequential scans, which is a big part of the latency.
-- Run manually in the Supabase SQL editor.

create index if not exists idx_products_category       on public.products (category);
create index if not exists idx_products_subcategory    on public.products (subcategory);
create index if not exists idx_products_seller_id      on public.products (seller_id);
create index if not exists idx_products_created_at      on public.products (created_at desc);
create index if not exists idx_products_active_approved on public.products (is_active, status);

-- Case-insensitive name search (ilike '%term%'). Requires pg_trgm.
create extension if not exists pg_trgm;
create index if not exists idx_products_name_trgm on public.products using gin (name gin_trgm_ops);
```

- [ ] **Step 2: Verify the SQL parses (syntax sanity, no DB connection)**

Run: `node -e "const fs=require('fs');const s=fs.readFileSync('backend/migrations/006_product_indexes.sql','utf8');if(!/create index/i.test(s))throw new Error('missing index DDL');console.log('OK, statements:',(s.match(/;/g)||[]).length)"`
Expected: `OK, statements: 7`.

- [ ] **Step 3: Commit**

```bash
git add backend/migrations/006_product_indexes.sql
git commit -m "Add migration 006: products filter/sort indexes (run manually)"
```

- [ ] **Step 4: Hand off to user**

Tell the user: "Migration `backend/migrations/006_product_indexes.sql` is ready — please run it in the Supabase SQL editor (it's idempotent, safe to re-run)."

---

## Task 9: Server-side pagination for the public products listing

**Files:**
- Modify: `frontend/pages/products/index.js`

This makes the listing fetch one page with the active category/subcategory/sort as query params, driven by the backend's existing `category`, `subcategory`, `search`, `limit`, `page` support. Brand/rating/availability filters in the sidebar are currently decorative (they don't filter) and stay decorative.

- [ ] **Step 1: Replace the data-loading + filtering logic (lines 9-99)**

Replace lines 9-99 (from `const PAGE_SIZE = 20;` through the `useEffect(() => { setCurrentPage(1); }, [...])`) with:

```js
const PAGE_SIZE = 20;

const SORT_MAP = {
  'price-asc':  'price_asc',
  'price-desc': 'price_desc',
  'new':        'newest',
  'rating':     'rating',
  'default':    '',
};

export default function ProductsPage({ initialProducts = [], initialTotal = 0, initialPage = 1 }) {
  const router = useRouter();
  const [products, setProducts] = useState(initialProducts || []);
  const [total, setTotal] = useState(initialTotal || 0);
  const [loading, setLoading] = useState(false);

  const initCategory = router.query.category ? [router.query.category] : [];
  const initSubs = router.query.subcategory ? router.query.subcategory.split(',') : [];

  const [selectedCategories, setSelectedCategories] = useState(initCategory);
  const [selectedSubcategories, setSelectedSubcategories] = useState(initSubs);
  const [sortBy, setSortBy] = useState('default');
  const [viewMode, setViewMode] = useState('grid');
  const [currentPage, setCurrentPage] = useState(initialPage || 1);

  // Sync category / subcategory from URL (navbar links change the URL)
  useEffect(() => {
    if (!router.isReady) return;
    const newCat = router.query.category ? [router.query.category] : [];
    setSelectedCategories(newCat);
    if (router.query.subcategory) {
      const validSubs = newCat.length > 0
        ? (categoriesData.find(c => c.id === newCat[0])?.subs || [])
        : [];
      const querySubs = router.query.subcategory.split(',');
      setSelectedSubcategories(querySubs.filter(s => validSubs.includes(s)));
    } else {
      setSelectedSubcategories([]);
    }
    setCurrentPage(1);
  }, [router.isReady, router.query.category, router.query.subcategory]);

  // Fetch the current page from the server whenever filters / sort / page change.
  useEffect(() => {
    if (!router.isReady) return;
    let cancelled = false;
    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000/api';
    const params = new URLSearchParams({ limit: String(PAGE_SIZE), page: String(currentPage) });
    if (selectedCategories[0]) params.set('category', selectedCategories[0]);
    if (selectedSubcategories.length === 1) params.set('subcategory', selectedSubcategories[0]);
    const sort = SORT_MAP[sortBy];
    if (sort) params.set('sort', sort);

    setLoading(true);
    fetchJsonWithTimeout(`${apiBase}/products?${params.toString()}`, 15000)
      .then((data) => {
        if (cancelled || !data?.success || !Array.isArray(data.data)) return;
        setProducts(data.data);
        setTotal(data.pagination?.total ?? data.meta?.total ?? data.data.length);
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [router.isReady, selectedCategories, selectedSubcategories, sortBy, currentPage]);

  // The server already filtered/sorted/paginated — render rows as-is.
  const pageProducts = products;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
```

> Note: the backend's `/products` route filters on a single `subcategory` value (`.eq`). Multi-subcategory selection therefore narrows to the first selected subcategory server-side; this matches the single-`.eq` contract. If multi-select subcategory filtering is required later, the backend route must accept a list — out of scope here.

- [ ] **Step 2: Update the product-count + loading display references**

The render block (now ~line 318) reads `filteredAndSorted.length`. Replace `<strong>{filteredAndSorted.length}</strong> products found` with:

```js
              <strong>{total}</strong> products found
```

And the loading guard (now ~line 340) reads `catalogLoading`. Replace `{catalogLoading && pageProducts.length === 0 ? (` with:

```js
          {loading && pageProducts.length === 0 ? (
```

- [ ] **Step 3: Replace getServerSideProps to fetch only page 1 with active filters**

Replace the `getServerSideProps` (lines 371-384) with:

```js
export async function getServerSideProps({ query, res }) {
  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
  try {
    const baseUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000/api';
    const params = new URLSearchParams({ limit: '20', page: '1' });
    if (query.category)    params.set('category', query.category);
    if (query.subcategory) params.set('subcategory', String(query.subcategory).split(',')[0]);
    const data = await fetchJsonWithTimeout(`${baseUrl}/products?${params.toString()}`, 12000);
    return {
      props: {
        initialProducts: data?.success ? (data.data || []) : [],
        initialTotal: data?.pagination?.total ?? data?.meta?.total ?? 0,
        initialPage: 1,
      },
    };
  } catch {
    return { props: { initialProducts: [], initialTotal: 0, initialPage: 1 } };
  }
}
```

- [ ] **Step 4: Manual smoke**

Start the frontend (`cd frontend && npm run dev`) and the backend. In a browser:
- Visit `http://localhost:3000/products` → page 1 of products loads, count shows the server total.
- Click a category in the sidebar → URL updates, list refetches that category's first page.
- Change sort → list reorders via a server refetch.
- Click page 2 → next page loads; network tab shows `GET /api/products?...&page=2&limit=20` (NOT `limit=1000`).

- [ ] **Step 5: Commit**

```bash
git add frontend/pages/products/index.js
git commit -m "Server-side pagination/filter/sort for products listing (drop limit=1000)"
```

---

## Task 10: Admin products page — request a capped page

**Files:**
- Modify: `frontend/pages/admin/products.js:49-55`

The admin page keeps its existing client-side search/filter UI but stops pulling the entire catalog; it requests a capped page (200) so the backend never runs the unbounded query.

- [ ] **Step 1: Change the fetch URL**

In `fetchProducts` (line 49), replace line 51:

```js
      const { res, json } = await adminJson('/api/products/all?limit=200&page=1');
```

- [ ] **Step 2: Manual smoke**

Visit `http://localhost:3000/admin/products` with an admin session. Expected: products load; network tab shows `GET /api/products/all?limit=200&page=1` returning 200 (not a 30s 500). Existing client-side search box still filters the loaded page.

- [ ] **Step 3: Commit**

```bash
git add frontend/pages/admin/products.js
git commit -m "Admin products: request capped page instead of limit=1000"
```

---

## Task 11: Cosmetic — remove duplicate head links in AdminLayout

**Files:**
- Modify: `frontend/components/admin/AdminLayout.js:38-46`

`_document.js` already loads the favicons, Google Fonts and FontAwesome globally. AdminLayout re-adds them via `next/head`, which (a) triggers the "Do not add stylesheets using next/head" warnings and (b) requests `/assets/favicon.svg`, which doesn't exist → 404. Removing the duplicates fixes all three at once.

- [ ] **Step 1: Delete the duplicate links**

In `frontend/components/admin/AdminLayout.js`, delete lines 38-46 (the `<link rel="icon" href="/assets/favicon.svg" .../>` and both `<link rel="stylesheet" .../>` blocks), leaving the `<title>` and `<meta description>` in the `<Head>`:

```jsx
      <Head>
        <title>{pageTitle}</title>
        {description ? <meta name="description" content={description} /> : null}
      </Head>
```

- [ ] **Step 2: Manual smoke**

Reload any `/admin` page. Console no longer shows the two "Do not add stylesheets using next/head" warnings nor the `/assets/favicon.svg` 404. Fonts and icons still render (loaded from `_document.js`).

- [ ] **Step 3: Commit**

```bash
git add frontend/components/admin/AdminLayout.js
git commit -m "Remove duplicate next/head font/favicon links in AdminLayout (fix warnings + 404)"
```

---

## Task 12: Cosmetic — scroll-behavior attribute

**Files:**
- Modify: `frontend/pages/_document.js:5`

- [ ] **Step 1: Add the attribute to <Html>**

Replace line 5 (`<Html lang="en">`) with:

```jsx
    <Html lang="en" data-scroll-behavior="smooth">
```

- [ ] **Step 2: Manual smoke**

Reload the site and navigate between routes. The "Detected `scroll-behavior: smooth` on the `<html>` element…" warning no longer appears in the console.

- [ ] **Step 3: Commit**

```bash
git add frontend/pages/_document.js
git commit -m "Add data-scroll-behavior to <Html> to silence Next.js scroll warning"
```

---

## Task 13: Cosmetic — ipwho.is sequential fallback

**Files:**
- Modify: `frontend/contexts/CurrencyContext.js:101-127`

The current code calls `ipwho.is` in parallel on every load. When it 403s, the browser logs a console error even though the result is handled. Calling it only when the server-side geo fails removes the request (and the error) in the common case where Vercel/Cloudflare geo headers resolve.

- [ ] **Step 1: Make the ipwho.is call a sequential fallback**

Replace lines 101-127 (the parallel `Promise.allSettled` block through the end of the client-side fallback `if (!geoCurrency) { ... }`) with:

```js
                // ── Dynamic-first geolocation ────────────────────────────
                // Try server-side geo first (Vercel/Cloudflare headers — fast,
                // no CORS). Only fall back to the third-party IP service when
                // the server gave us nothing, so a flaky ipwho.is 403 doesn't
                // spam the console on every load.
                let geoCurrency = null;
                let geoDetected = false;

                try {
                    const serverData = await fetch('/api/location-currency', { cache: 'no-store' })
                        .then(r => r.ok ? r.json() : null)
                        .catch(() => null);
                    if (serverData?.success && serverData?.detected && serverData?.currency?.code) {
                        geoCurrency = serverData.currency.code;
                        geoDetected = true;
                    }
                } catch (_) {}

                if (!geoCurrency) {
                    try {
                        const clientData = await fetch('https://ipwho.is/', { cache: 'no-store' })
                            .then(r => r.ok ? r.json() : null)
                            .catch(() => null);
                        if (clientData?.success && clientData?.currency?.code) {
                            geoCurrency = clientData.currency.code;
                            geoDetected = true;
                        }
                    } catch (_) {}
                }
```

- [ ] **Step 2: Manual smoke**

Reload the homepage. When `/api/location-currency` resolves (the normal case on Vercel), the `GET https://ipwho.is/ 403` no longer appears. Currency still displays correctly (falls back through timezone/locale/USD as before).

- [ ] **Step 3: Commit**

```bash
git add frontend/contexts/CurrencyContext.js
git commit -m "Call ipwho.is only as a sequential geo fallback to stop console 403 spam"
```

---

## Self-Review

**Spec coverage:**
- Spec §1 (shared lib) → Task 1. ✓
- Spec §2 (verifyToken) → Task 2. ✓
- Spec §3 (/auth/me, admin lists, orders/all, stores/all) → Tasks 3, 4, 5, 6. ✓
- Spec §4 (server-side products) → backend Task 7, indexes Task 8, public listing Task 9, admin page Task 10. ✓
- Spec §5 cosmetic: favicon 404 + next/head stylesheets → Task 11; scroll-behavior → Task 12; ipwho.is → Task 13. ✓
- `getEmailMap` dedupe (spec "new shared helper") → defined in Task 1, used in Tasks 4 & 5. ✓

**Type/name consistency:** `withTimeout(run, ms)`, `makeCache({ttlMs}).get→{value,fresh}`, `singleFlight()→run(key,fn)`, `getEmailMap()→Map` — used identically across Tasks 1–7. ✓

**Placeholder scan:** No TBD/TODO; every code step shows full code. ✓

**Known scope notes (intentional, not gaps):** multi-subcategory filtering narrows to the first value server-side (backend uses single `.eq`); the admin products page keeps client-side search over a capped 200-row page rather than a full pagination UI; the public-list cache machinery in products.js is left intact rather than re-routed through `makeCache` to avoid regressing a working path.
