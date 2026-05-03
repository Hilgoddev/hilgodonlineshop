const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const supabase = require('../config/supabase');
const paystack = require('../config/paystack');
const { verifyToken } = require('./auth');

// Initialize Payment
router.post('/initialize', verifyToken, async (req, res, next) => {
    try {
        const { order_id, email, amount } = req.body; // Amount should be in kobo/cents depending on currency
        
        // Ensure order belongs to user
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .select('*')
            .eq('id', order_id)
            .eq('user_id', req.user.id)
            .single();
            
        if (orderError || !order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }
        
        // Initialize Paystack transaction
        const response = await paystack.transaction.initialize({
            email,
            amount: amount * 100, // convert to subunits
            reference: `ORD_${order_id}_${Date.now()}`,
            metadata: {
                order_id: order_id,
                user_id: req.user.id
            }
        });
        
        // Save the payment reference to the order
        await supabase
            .from('orders')
            .update({ payment_reference: response.data.reference })
            .eq('id', order_id);
            
        res.status(200).json({ success: true, data: response.data });
    } catch (err) {
        next(err);
    }
});

// Paystack Webhook endpoint
// Note: In index.js, we need to ensure this route uses express.raw({ type: 'application/json' }) 
// to properly verify the Paystack signature.
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    
    // Validate signature
    const hash = crypto.createHmac('sha512', secret).update(req.body).digest('hex');
    if (hash !== req.headers['x-paystack-signature']) {
        return res.status(400).send('Invalid signature');
    }
    
    // Parse the JSON event
    const event = JSON.parse(req.body.toString());
    
    try {
        if (event.event === 'charge.success') {
            const { reference, metadata } = event.data;
            const order_id = metadata.order_id;
            
            // Update order status securely bypassing RLS (using service_role key configured in supabase.js)
            const { error } = await supabase
                .from('orders')
                .update({ status: 'paid' })
                .eq('id', order_id)
                .eq('payment_reference', reference);
                
            if (error) throw error;
            
            // Clear user's cart (optional based on your flow)
            await supabase
                .from('cart_items')
                .delete()
                .eq('user_id', metadata.user_id);
        }
        
        res.sendStatus(200);
    } catch (err) {
        console.error('Webhook processing error:', err);
        res.sendStatus(500);
    }
});

module.exports = router;
