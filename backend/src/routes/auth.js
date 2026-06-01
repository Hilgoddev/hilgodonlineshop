const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

// Middleware to verify Supabase token
const verifyToken = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
        return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    req.user = user;
    next();
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

// Get current user profile
router.get('/me', verifyToken, async (req, res, next) => {
    try {
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', req.user.id)
            .maybeSingle();

        if (error) throw error;
        if (!profile) return res.status(404).json({ success: false, data: null, message: 'Profile not found' });

        res.status(200).json({ success: true, data: profile });
    } catch (err) {
        next(err);
    }
});

module.exports = { router, verifyToken };
