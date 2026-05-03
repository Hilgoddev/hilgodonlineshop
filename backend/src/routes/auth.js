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

        if (!profile) {
            // Profile trigger might have missed, or we need to update it
            const { error: insertError } = await supabase
                .from('profiles')
                .upsert({
                    id: user.id,
                    username: user.email.split('@')[0],
                    full_name: full_name || user.user_metadata?.full_name,
                    avatar_url: avatar_url || user.user_metadata?.avatar_url,
                });
                
            if (insertError) throw insertError;
        }

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
            .single();
            
        if (error) throw error;
        
        res.status(200).json({ success: true, data: profile });
    } catch (err) {
        next(err);
    }
});

module.exports = { router, verifyToken };
