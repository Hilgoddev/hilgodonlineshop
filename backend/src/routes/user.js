const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { verifyToken } = require('./auth');

const splitName = (fullName = '') => {
    const parts = fullName.trim().split(' ').filter(Boolean);
    return { firstName: parts[0] || '', lastName: parts.slice(1).join(' ') || '' };
};

const mapProfile = (profile, user) => {
    const names = splitName(profile?.full_name || user?.user_metadata?.full_name || '');
    return {
        _id: user.id,
        id: user.id,
        email: user.email,
        firstName: names.firstName,
        lastName: names.lastName,
        image: profile?.avatar_url || user.user_metadata?.avatar_url || '',
        role: profile?.role || 'customer',
        provider: (user.app_metadata?.providers || [])[0] === 'google' ? 'google' : 'email',
        createdAt: profile?.created_at || user.created_at
    };
};

router.get('/profile', verifyToken, async (req, res, next) => {
    try {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', req.user.id).single();
        res.status(200).json({ success: true, data: mapProfile(profile, req.user) });
    } catch (err) {
        next(err);
    }
});

router.put('/profile', verifyToken, async (req, res, next) => {
    try {
        const { firstName = '', lastName = '', image = '' } = req.body;
        const full_name = `${firstName} ${lastName}`.trim();

        const { data, error } = await supabase
            .from('profiles')
            .update({ full_name, avatar_url: image || null })
            .eq('id', req.user.id)
            .select('*')
            .single();
        if (error) throw error;

        res.status(200).json({ success: true, data: mapProfile(data, req.user) });
    } catch (err) {
        next(err);
    }
});

router.put('/password', verifyToken, async (req, res, next) => {
    try {
        const { newPassword } = req.body;
        if (!newPassword || String(newPassword).length < 8) {
            return res.status(400).json({ success: false, error: 'New password must be at least 8 characters' });
        }

        const { error } = await supabase.auth.admin.updateUserById(req.user.id, { password: newPassword });
        if (error) throw error;
        res.status(200).json({ success: true, message: 'Password updated successfully' });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
