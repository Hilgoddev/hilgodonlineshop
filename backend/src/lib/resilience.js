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
// data while a background refresh runs. Capped at `maxEntries` (oldest written
// first out) so per-token/per-user caches can't grow without bound on a
// long-running server.
function makeCache({ ttlMs, maxEntries = 5000 }) {
    const store = new Map();
    return {
        get(key) {
            const e = store.get(key);
            if (!e) return undefined;
            return { value: e.value, fresh: e.freshUntil > Date.now() };
        },
        set(key, value) {
            store.delete(key); // re-insert so Map order tracks write recency
            store.set(key, { value, freshUntil: Date.now() + ttlMs });
            while (store.size > maxEntries) store.delete(store.keys().next().value);
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

// Every auth user, following pagination — listUsers returns at most `perPage`
// users per call, so a single call silently drops everyone past the first page.
async function listAllUsers({ perPage = 1000, maxPages = 50 } = {}) {
    const all = [];
    for (let page = 1; page <= maxPages; page++) {
        const { data, error } = await withTimeout(
            () => supabase.auth.admin.listUsers({ page, perPage }),
            12 * 1000,
        );
        if (error) throw error;
        const users = data?.users || [];
        all.push(...users);
        if (users.length < perPage) break;
    }
    return all;
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
            const users = await listAllUsers();
            return new Map(users.map((u) => [u.id, u.email]));
        });
        emailMapCache.set('all', map);
        return map;
    } catch (err) {
        console.error('getEmailMap failed:', err?.message || err);
        if (cached) return cached.value; // serve stale rather than nothing
        return new Map();
    }
}

module.exports = { withTimeout, makeCache, singleFlight, getEmailMap, listAllUsers };
