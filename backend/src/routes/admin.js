const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { verifyToken } = require('./auth');

const requireAdmin = async (req, res, next) => {
    try {
        const { data: profile, error } = await supabase.from('profiles').select('role').eq('id', req.user.id).single();
        if (error || !profile || profile.role !== 'admin') return res.status(403).json({ success: false, error: 'Admin access required' });
        next();
    } catch (err) {
        next(err);
    }
};

router.get('/customers', verifyToken, requireAdmin, async (req, res, next) => {
    try {
        const { data: profiles, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
        if (error) throw error;

        const userIds = (profiles || []).map((p) => p.id);
        const { data: orders } = userIds.length
            ? await supabase.from('orders').select('id, user_id, total_amount')
            : { data: [] };

        const stats = (orders || []).reduce((map, o) => {
            const entry = map.get(o.user_id) || { orderCount: 0, totalSpent: 0 };
            entry.orderCount += 1;
            entry.totalSpent += Number(o.total_amount || 0);
            map.set(o.user_id, entry);
            return map;
        }, new Map());

        const data = (profiles || []).map((p) => {
            const names = (p.full_name || '').split(' ');
            const s = stats.get(p.id) || { orderCount: 0, totalSpent: 0 };
            return {
                _id: p.id,
                id: p.id,
                firstName: names[0] || p.username || 'User',
                lastName: names.slice(1).join(' ') || '',
                email: p.username || '',
                image: p.avatar_url || '',
                provider: 'email',
                role: p.role || 'customer',
                orderCount: s.orderCount,
                totalSpent: s.totalSpent,
                createdAt: p.created_at
            };
        });

        res.status(200).json({ success: true, data, pagination: { total: data.length } });
    } catch (err) {
        next(err);
    }
});

router.put('/promote', verifyToken, requireAdmin, async (req, res, next) => {
    try {
        const { userId, newRole } = req.body;
        if (!userId || !['admin', 'customer', 'seller'].includes(newRole)) {
            return res.status(400).json({ success: false, error: 'Valid userId and newRole are required' });
        }

        const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
        if (error) throw error;
        res.status(200).json({ success: true, message: `User role updated to ${newRole}` });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
