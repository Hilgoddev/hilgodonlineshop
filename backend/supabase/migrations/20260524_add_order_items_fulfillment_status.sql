-- Adds per-item fulfillment tracking to order_items.
-- Safe to run multiple times.

BEGIN;

-- 1) Add column if missing
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS fulfillment_status TEXT;

-- 2) Backfill existing/null rows
UPDATE public.order_items
SET fulfillment_status = 'pending'
WHERE fulfillment_status IS NULL;

-- 3) Set default for new rows
ALTER TABLE public.order_items
  ALTER COLUMN fulfillment_status SET DEFAULT 'pending';

-- 4) Enforce allowed values (add constraint only if it doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'order_items_fulfillment_status_check'
      AND conrelid = 'public.order_items'::regclass
  ) THEN
    ALTER TABLE public.order_items
      ADD CONSTRAINT order_items_fulfillment_status_check
      CHECK (fulfillment_status IN ('pending', 'packed', 'shipped', 'delivered', 'cancelled'));
  END IF;
END
$$;

-- 5) Ensure non-null going forward
ALTER TABLE public.order_items
  ALTER COLUMN fulfillment_status SET NOT NULL;

COMMIT;

