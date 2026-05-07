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

        // Check if profile exists
        const { data: profile, error: fetchError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "No rows found"
            throw fetchError;
        }

        const baseUsername = profile?.username || user.email.split('@')[0];
        // simple unique fallback
        const uniqueUsername = profile?.username ? baseUsername : `${baseUsername}${Math.floor(Math.random() * 1000)}`;

        const payload = {
            id: user.id,
            username: uniqueUsername,
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

// Auto-confirm email — only active when EMAIL_VERIFICATION_ENABLED=false
// Change EMAIL_VERIFICATION_ENABLED to "true" in backend .env to require email confirmation instead
router.post('/auto-confirm', async (req, res, next) => {
    try {
        if (process.env.EMAIL_VERIFICATION_ENABLED !== 'false') {
            return res.status(403).json({ success: false, message: 'Email verification is enabled' });
        }

        const { email } = req.body;
        if (!email) return res.status(400).json({ success: false, message: 'Email required' });

        const { data, error: listError } = await supabase.auth.admin.listUsers({ perPage: 1000 });
        if (listError) throw listError;

        const user = data?.users?.find(u => u.email === email);
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
    try {
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', req.user.id)
            .single();
            
        if (error) throw error;
        
        res.status(200).json({ success: true, data: profile });
    } catch (err) {
        next(err);
    }
});

module.exports = { router, verifyToken };
