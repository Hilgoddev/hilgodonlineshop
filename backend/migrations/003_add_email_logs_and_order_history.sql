-- Migration 003: Add email logging and order status history
-- Purpose: Debug email delivery issues and track order status changes

-- =====================================================
-- PART 1: Email Logging Table
-- =====================================================

CREATE TABLE IF NOT EXISTS email_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    to_email TEXT NOT NULL,
    from_email TEXT NOT NULL, -- Track sender address per email type
    subject TEXT NOT NULL,
    email_type TEXT DEFAULT 'general', -- 'order_confirmation', 'order_status', 'payment_confirmed', 'admin_alert', etc.
    order_id UUID, -- Optional reference to order
    user_id UUID, -- Optional reference to user
    status TEXT DEFAULT 'sent', -- 'sent', 'delivered', 'failed', 'bounced'
    provider_response TEXT, -- Response from email provider
    error_message TEXT, -- Error details if failed
    metadata JSONB, -- Additional data like template vars
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for email logs
CREATE INDEX IF NOT EXISTS idx_email_logs_to_email ON email_logs(to_email);
CREATE INDEX IF NOT EXISTS idx_email_logs_order_id ON email_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_user_id ON email_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_created_at ON email_logs(created_at);

-- =====================================================
-- PART 2: Order Status History Table
-- =====================================================

CREATE TABLE IF NOT EXISTS order_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    old_status TEXT, -- NULL if this is the initial status
    new_status TEXT NOT NULL,
    changed_by UUID, -- User ID who made the change (NULL for system/webhook)
    changed_by_role TEXT, -- 'admin', 'seller', 'customer', 'system', 'webhook'
    changed_by_email TEXT, -- Email of person who made change (for reference)
    notes TEXT, -- Optional notes about the change
    ip_address INET, -- IP address of the change (for audit)
    user_agent TEXT, -- User agent of the change (for audit)
    metadata JSONB, -- Additional data like payment reference, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for order status history
CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id ON order_status_history(order_id);
CREATE INDEX IF NOT EXISTS idx_order_status_history_created_at ON order_status_history(created_at);
CREATE INDEX IF NOT EXISTS idx_order_status_history_changed_by ON order_status_history(changed_by);
CREATE INDEX IF NOT EXISTS idx_order_status_history_new_status ON order_status_history(new_status);

-- =====================================================
-- PART 3: Search Optimization Indexes
-- =====================================================

-- Add pg_trgm extension for fuzzy search if not exists
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Text search indexes for products
CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON products USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_products_description_trgm ON products USING gin (description gin_trgm_ops);

-- Composite index for common search queries
CREATE INDEX IF NOT EXISTS idx_products_search_composite ON products(is_active, status, created_at DESC) 
WHERE is_active = true AND status = 'approved';

-- =====================================================
-- PART 4: Update orders table trigger
-- =====================================================

-- Function to automatically log order status changes
CREATE OR REPLACE FUNCTION log_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Only log if status actually changed
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO order_status_history (
            order_id,
            old_status,
            new_status,
            changed_by_role,
            metadata
        ) VALUES (
            NEW.id,
            OLD.status,
            NEW.status,
            'system', -- Will be updated by application if user-initiated
            jsonb_build_object(
                'payment_reference', NEW.payment_reference,
                'total_amount', NEW.total_amount
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic status logging
DROP TRIGGER IF EXISTS trg_order_status_change ON orders;
CREATE TRIGGER trg_order_status_change
    AFTER UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION log_order_status_change();

-- =====================================================
-- PART 5: RLS Policies (if using Row Level Security)
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;

-- Email logs policy: Users can only see their own emails
CREATE POLICY IF NOT EXISTS email_logs_user_policy ON email_logs
    FOR SELECT
    USING (user_id = auth.uid());

-- Order status history policy: Based on order access
CREATE POLICY IF NOT EXISTS order_status_history_user_policy ON order_status_history
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM orders o 
            WHERE o.id = order_status_history.order_id 
            AND o.user_id = auth.uid()
        )
    );

-- Admin can see all
CREATE POLICY IF NOT EXISTS order_status_history_admin_policy ON order_status_history
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = auth.uid() 
            AND p.role = 'admin'
        )
    );

-- =====================================================
-- Summary
-- =====================================================
-- This migration adds:
-- 1. email_logs table for debugging email delivery
-- 2. order_status_history table for audit trail
-- 3. Search optimization indexes
-- 4. Automatic status change logging via trigger
-- 5. RLS policies for security
--
-- After applying:
-- - All email sends will be logged
-- - All order status changes will be tracked
-- - Product search will be faster
-- - Full audit trail available
-- =====================================================