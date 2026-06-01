const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { withTimeout, makeCache, singleFlight } = require('../lib/resilience');
const meCache = makeCache({ ttlMs: 30 * 1000 });

// Supabase's auth endpoint (GoTrue) is slow/flaky on the free tier (~6s per
// call, occasional connection drops). verifyToken runs on EVERY authenticated
// request, so re-validating the same token every time pushes requests past the
// timeout and 503s them (which was blocking checkout). We validate a token once,
// cache the identity, and reuse it for subsequent requests. Access tokens are
// short-lived anyway, so a few minutes of caching is safe.
const tokenCache = makeCache({ ttlMs: 5 * 60 * 1000 });
const tokenFlight = singleFlight();
const AUTH_TIMEOUT_MS = 12 * 1000;

// Validate a bearer token against Supabase, coalescing concurrent identical
// validations. Throws an error tagged `invalidToken` for genuine auth failures
// (so callers can 401) vs. a plain error for transient outages (so callers can
// serve a cached identity or 503).
async function validateToken(token) {
    return tokenFlight(token, async () => {
        const { data: { user } = {}, error } = await withTimeout(
            () => supabase.auth.getUser(token),
            AUTH_TIMEOUT_MS,
        );
        if (error || !user) {
            const err = new Error('Invalid token');
            err.invalidToken = true;
            throw err;
        }
        return user;
    });
}

// Middleware to verify Supabase token
const verifyToken = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const cached = tokenCache.get(token);
    if (cached && cached.fresh) {
        req.user = cached.value;
        return next();
    }

    try {
        const user = await validateToken(token);
        tokenCache.set(token, user);
        req.user = user;
        return next();
    } catch (e) {
        if (e && e.invalidToken) {
            return res.status(401).json({ success: false, message: 'Invalid token' });
        }
        // Timeout / transient outage — NOT an auth failure. If we validated this
        // exact token recently, trust that identity rather than blocking the user.
        if (cached) {
            req.user = cached.value;
            return next();
        }
        return res.status(503).json({ success: false, message: 'Auth temporarily unavailable' });
    }
};

// Sync user profile after signup/login
router.post('/sync-profile', verifyToken, async (req, res, next) => {
    try {
        const { user } = req;
        const { full_name, avatar_url } = req.body;

        const { data: profile, error: fetchError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
            throw fetchError;
        }

        // Use existing username, or derive one from email + unique user-ID suffix (collision-safe)
        let username;
        if (profile?.username) {
            username = profile.username;
        } else {
            const base = user.email ? user.email.split('@')[0] : 'user';
            username = `${base}_${user.id.slice(0, 6)}`;
        }

        const payload = {
            id: user.id,
            username,
            full_name:
                full_name ||
                user.user_metadata?.full_name ||
                user.user_metadata?.name ||
                profile?.full_name ||
                null,
            avatar_url: avatar_url || user.user_metadata?.avatar_url || user.user_metadata?.picture || profile?.avatar_url || null,
            role: profile?.role || 'customer',
        };

        const { error: upsertError } = await supabase.from('profiles').upsert(payload);
        if (upsertError) throw upsertError;

        res.status(200).json({ success: true, message: 'Profile synced successfully' });
    } catch (err) {
        next(err);
    }
});

// Auto-confirm email — ONLY active when EMAIL_VERIFICATION_ENABLED=false.
// When verification is enabled (the default), this returns 403 and the signup
// page shows the "check your email" modal instead.
router.post('/auto-confirm', async (req, res, next) => {
    try {
        if (process.env.EMAIL_VERIFICATION_ENABLED !== 'false') {
            return res.status(403).json({ success: false, message: 'Email verification is enabled' });
        }

        const { email } = req.body;
        if (!email) return res.status(400).json({ success: false, message: 'Email required' });

        const { data, error: listError } = await supabase.auth.admin.listUsers({ perPage: 1000 });
        if (listError) throw listError;

        const user = data?.users?.find((u) => u.email === email);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        if (user.email_confirmed_at) {
            return res.json({ success: true, message: 'Already confirmed' });
        }

        const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, { email_confirm: true });
        if (updateError) throw updateError;

        res.json({ success: true, message: 'Email confirmed' });
    } catch (err) {
        next(err);
    }
});

// Get current user profile
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

module.exports = { router, verifyToken };
