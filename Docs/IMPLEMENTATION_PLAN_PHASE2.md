# Implementation Plan - Phase 2 & Critical Fixes

**Date:** May 30, 2026  
**Focus:** Fix critical issues and implement missing features

---

## 🔍 Audit Findings Summary

### ✅ What's Already Working Well

1. **Email Service Configuration** ✅
   - Resend API properly configured
   - Email templates well-designed
   - Order confirmation, status updates, seller notifications all implemented
   - Payment confirmation emails implemented

2. **Payment Webhooks** ✅
   - Paystack webhook properly implemented with idempotency
   - Stripe webhook properly implemented with signature verification
   - Both call `handlePaymentSuccess()` which sends emails and updates stock
   - Amount validation and order ownership verification in place

3. **Order Tracking** ✅
   - Live tracking page with 15-second polling
   - Visual progress timeline
   - Order status displayed correctly
   - Real-time updates implemented

4. **Admin Order Management** ✅
   - Comprehensive admin orders page
   - Status filtering and search
   - Order details with customer info
   - Status updates with save functionality
   - Payment status tracking

5. **Seller Order Management** ✅
   - Seller-specific orders page
   - Fulfillment status per item
   - Seller can update item status
   - Revenue tracking

---

## ⚠️ Issues to Address

### 1. Email Delivery Issues (User Complaint: No Confirmation Email)

**Possible Causes:**
- RESEND_API_KEY not configured in production
- EMAIL_FROM address not verified in Resend
- Email going to spam folder
- Environment variables not loaded in Render deployment

**Action Items:**
- [ ] Verify RESEND_API_KEY is set in Render environment variables
- [ ] Verify EMAIL_FROM domain is verified in Resend dashboard
- [ ] Add email delivery logging for debugging
- [ ] Test email sending in production environment

### 2. Product Search Not Smooth

**Current Implementation:**
- Basic search using `ilike` (case-insensitive like) query
- No search optimization or indexing
- No autocomplete or suggestions

**Action Items:**
- [ ] Add database indexes on product name and description
- [ ] Implement search result caching
- [ ] Add search autocomplete/suggestions
- [ ] Consider implementing fuzzy search

### 3. Post-Order Status Flow Consistency

**Current State:**
- Order status updated by payment webhooks
- Admin can manually update status
- No automated status progression
- No order status history/audit log

**Action Items:**
- [ ] Create order_status_history table for audit trail
- [ ] Log all status changes with timestamp and actor
- [ ] Add automated status progression (pending → paid → processing → shipped → delivered)
- [ ] Ensure status changes trigger email notifications

### 4. Payment Callback Confirmation

**Current State:**
- Webhooks properly implemented
- `handlePaymentSuccess()` called on successful payment
- Emails sent but may not be delivered

**Verification Needed:**
- [ ] Verify webhooks are being received in production
- [ ] Check Render logs for webhook processing
- [ ] Verify payment_events table is being populated
- [ ] Test end-to-end payment flow

### 5. Pay on Delivery (POD) Order Visibility

**Current State:**
- POD orders created with status 'processing'
- Orders should appear in admin and seller dashboards

**Verification Needed:**
- [ ] Verify POD orders appear in admin orders page
- [ ] Verify POD orders appear in seller orders page
- [ ] Check if seller receives notification for POD orders
- [ ] Ensure POD orders can be fulfilled like paid orders

### 6. Return Request Implementation

**Current State:**
- Return request page exists
- Form submission implemented

**Verification Needed:**
- [ ] Test return request submission
- [ ] Verify return requests appear in admin
- [ ] Check if seller is notified of returns
- [ ] Verify return status tracking

---

## 📋 Implementation Tasks

### Phase 1: Critical Email & Payment Fixes (Priority 1)

#### Task 1.1: Fix Email Delivery
```sql
-- Add to migration or run in Supabase SQL Editor
CREATE TABLE IF NOT EXISTS email_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    to_email TEXT NOT NULL,
    subject TEXT NOT NULL,
    status TEXT DEFAULT 'sent',
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Files to Modify:**
- `backend/src/services/email.js` - Add logging
- `backend/src/routes/payment.js` - Add webhook logging
- `backend/src/routes/orders.js` - Add order email logging

#### Task 1.2: Verify Environment Variables
**Check in Render Dashboard:**
- RESEND_API_KEY
- EMAIL_FROM
- STRIPE_WEBHOOK_SECRET
- PAYSTACK_SECRET_KEY

#### Task 1.3: Add Webhook Debug Logging
Add detailed logging to track webhook reception and processing.

### Phase 2: Improve Search & Order Tracking (Priority 2)

#### Task 2.1: Optimize Product Search
**Database Changes:**
```sql
-- Add indexes for better search performance
CREATE INDEX IF NOT EXISTS idx_products_name_search ON products USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_products_description_search ON products USING gin (description gin_trgm_ops);
```

**API Changes:**
- Add search result caching
- Implement search suggestions
- Add search analytics

#### Task 2.2: Add Order Status History
**Database Schema:**
```sql
CREATE TABLE order_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id),
    old_status TEXT,
    new_status TEXT NOT NULL,
    changed_by UUID, -- user_id or 'system'
    changed_by_role TEXT, -- 'admin', 'seller', 'system'
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_order_status_history_order_id ON order_status_history(order_id);
CREATE INDEX idx_order_status_history_created_at ON order_status_history(created_at);
```

**Backend Changes:**
- Modify order status update to log history
- Add endpoint to retrieve order history
- Update email notifications to include status change info

#### Task 2.3: Enhance Order Tracking Page
**Frontend Changes:**
- Display full order status history
- Show who changed status and when
- Add estimated delivery updates
- Improve visual timeline

### Phase 3: Testing Infrastructure (Priority 3)

#### Task 3.1: Set Up Testing Framework
```bash
# Install testing dependencies
npm install --save-dev jest @testing-library/react @testing-library/jest-dom
npm install --save-dev supertest
```

#### Task 3.2: Write Critical Tests
- [ ] Email sending function tests
- [ ] Payment webhook processing tests
- [ ] Order creation tests
- [ ] Order status update tests
- [ ] User authentication tests

---

## 🚀 Implementation Order

### Week 1: Critical Fixes
1. Fix email delivery (verify env vars, test Resend)
2. Add email logging for debugging
3. Verify payment webhooks in production
4. Test POD order visibility

### Week 2: Search & Tracking
1. Add database indexes for search
2. Implement order status history
3. Enhance order tracking page
4. Test return request flow

### Week 3: Testing & Polish
1. Set up testing framework
2. Write critical tests
3. Fix any remaining issues
4. Deploy to production

---

## 📊 Success Metrics

### Email Delivery
- [ ] 95%+ email delivery rate
- [ ] Order confirmation emails received within 1 minute
- [ ] Status update emails received within 1 minute

### Search Performance
- [ ] Search results under 200ms
- [ ] Search autocomplete working
- [ ] Relevant search results

### Order Tracking
- [ ] Full order history visible
- [ ] Status changes logged
- [ ] Real-time updates working
- [ ] POD orders visible to sellers

### Testing Coverage
- [ ] 80%+ test coverage for critical paths
- [ ] All payment flows tested
- [ ] All order flows tested

---

## 🔗 Related Files

### Backend
- `backend/src/services/email.js` - Email service
- `backend/src/services/paymentSuccess.js` - Payment success handler
- `backend/src/routes/payment.js` - Payment webhooks
- `backend/src/routes/orders.js` - Order management
- `backend/src/routes/stripe.js` - Stripe integration

### Frontend
- `frontend/pages/track-order.js` - Order tracking
- `frontend/pages/admin/orders.js` - Admin orders
- `frontend/pages/seller/orders.js` - Seller orders
- `frontend/pages/return-request.js` - Returns

### Database
- `backend/migrations/002_fix_profiles_and_order_items_schema.sql` - Current migration
- `backend/supabase/schema.sql` - Full schema

---

## 📝 Notes

### Features NOT Being Implemented (Per User Request)
- ~~Loyalty points system~~ - Noted, not implementing
- ~~Gift cards functionality~~ - Noted, not implementing

### Items to Identify & Note Only
- ~~Mobile responsiveness issues~~ - Will document only
- ~~UI consistency issues~~ - Will document only

---

**Next Steps:** Begin with Task 1.1 (Fix Email Delivery) as this is the most critical user-facing issue.