-- Guarantee product stock can never go negative at the database level.
-- The decrement_product_stock RPC (migration 004) already guards with
-- `WHERE stock >= quantity`, but a direct/manual UPDATE could still drive
-- stock below zero. This CHECK constraint is the last line of defence.
--
-- Run in the Supabase SQL editor (same manual step as migration 004).
-- If any existing rows already have negative stock the ALTER will fail;
-- clamp them first with the UPDATE below, then add the constraint.

UPDATE products SET stock = 0 WHERE stock < 0;

ALTER TABLE products
  ADD CONSTRAINT products_stock_non_negative CHECK (stock >= 0);
