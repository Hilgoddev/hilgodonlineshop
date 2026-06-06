-- ============================================================
-- Migration 008: store the payment method on each order
-- Run in the Supabase SQL editor.
-- ============================================================

-- 1. Add the column (idempotent).
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method TEXT;

-- 2. Backfill existing orders, best-effort, from the payment reference:
--    Paystack init refs look like "ORD_<id>_<ts>", Stripe PaymentIntents "pi_...".
UPDATE orders
   SET payment_method = 'stripe'
 WHERE payment_method IS NULL
   AND payment_reference LIKE 'pi_%';

UPDATE orders
   SET payment_method = 'paystack'
 WHERE payment_method IS NULL
   AND payment_reference LIKE 'ORD\_%';

-- Anything still null is an offline order (bank transfer / pay on delivery) or
-- pre-dates this column; leave as NULL → shown as "—"/Unknown in the UI.

SELECT 'Migration 008 complete' AS result;
