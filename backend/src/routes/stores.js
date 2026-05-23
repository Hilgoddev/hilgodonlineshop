const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { verifyToken } = require('./auth');

// Middleware to verify admin role
const requireAdmin = async (req, res, next) => {
    try {
        const { data: profile, error } = await supabase.from('profiles').select('role').eq('id', req.user.id).single();
        if (error || !profile || profile.role !== 'admin') {
            return res.status(403).json({ success: false, error: 'Admin access required' });
        }
        next();
    } catch (err) {
        next(err);
    }
};

// Middleware to verify seller role
const requireSeller = async (req, res, next) => {
    try {
        const { data: profile, error } = await supabase.from('profiles').select('role').eq('id', req.user.id).single();
        if (error || !profile || !['admin', 'seller'].includes(profile.role)) {
            return res.status(403).json({ success: false, error: 'Seller or Admin access required' });
        }
        req.userRole = profile.role;
        next();
    } catch (err) {
        next(err);
    }
};

// Get all stores (Public)
router.get('/', async (req, res, next) => {
    try {
        const { data, error } = await supabase
            .from('stores')
            .select('id, name, slug, description, logo_url, status')
            .eq('status', 'approved');
            
        if (error) throw error;
        res.status(200).json({ success: true, data });
    } catch (err) {
        next(err);
    }
});

// Admin get all stores (including unapproved)
router.get('/all', verifyToken, requireAdmin, async (req, res, next) => {
    try {
        const { data, error } = await supabase
            .from('stores')
            .select('*')
            .order('created_at', { ascending: false });
            
        if (error) throw error;
        res.status(200).json({ success: true, data });
    } catch (err) {
        next(err);
    }
});

// Get current seller/admin store profile
router.get('/me', verifyToken, requireSeller, async (req, res, next) => {
    try {
        let query = supabase
            .from('stores')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1);

        if (req.userRole === 'seller') {
            query = query.eq('owner_id', req.user.id);
        }

        const { data, error } = await query;
        if (error) throw error;
        res.status(200).json({ success: true, data: data?.[0] || null });
    } catch (err) {
        next(err);
    }
});

// Get store by slug
router.get('/:slug', async (req, res, next) => {
    try {
        const { data, error } = await supabase
            .from('stores')
            .select('id, name, slug, description, logo_url, status')
            .eq('slug', req.params.slug)
            .single();
            
        if (error) throw error;
        res.status(200).json({ success: true, data });
    } catch (err) {
        next(err);
    }
});

// Create a store (Seller only)
router.post('/', verifyToken, requireSeller, async (req, res, next) => {
    try {
        const { name, slug, description, logo_url } = req.body;
        
        // Auto-approve if admin, otherwise pending
        const status = req.userRole === 'admin' ? 'approved' : 'pending';
        
        const { data, error } = await supabase
            .from('stores')
            .insert([{ owner_id: req.user.id, name, slug, description, logo_url, status }])
            .select();
            
        if (error) throw error;
        res.status(201).json({ success: true, data: data[0] });
    } catch (err) {
        next(err);
    }
});

// Update a store (Seller updates own, Admin updates any)
router.put('/:id', verifyToken, requireSeller, async (req, res, next) => {
    try {
        const { name, slug, description, logo_url, status } = req.body;
        
        let updateData = { name, slug, description, logo_url };
        
        // Only admin can change approval status
        if (req.userRole === 'admin' && status) {
            updateData.status = status;
        }

        let query = supabase.from('stores').update(updateData).eq('id', req.params.id);
        
        if (req.userRole === 'seller') {
            query = query.eq('owner_id', req.user.id);
        }
        
        const { data, error } = await query.select();
            
        if (error) throw error;
        if (!data || data.length === 0) {
            return res.status(404).json({ success: false, error: 'Store not found or access denied' });
        }
        res.status(200).json({ success: true, data: data[0] });
    } catch (err) {
        next(err);
    }
});

// PATCH store status (Admin only)
router.patch('/:id/status', verifyToken, requireAdmin, async (req, res, next) => {
    try {
        const { status } = req.body;
        if (!['pending', 'approved', 'rejected'].includes(status)) {
            return res.status(400).json({ success: false, error: 'Invalid status' });
        }

        const { data, error } = await supabase
            .from('stores')
            .update({ status })
            .eq('id', req.params.id)
            .select()
            .single();

        if (error) throw error;
        
        // TODO: Send email notification to store owner about status change
        console.log(`[EMAIL MOCK] Notifying store owner (ID: ${data.owner_id}) that their store "${data.name}" is now ${status}`);

        res.status(200).json({ success: true, data });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
