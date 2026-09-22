-- 021_order_line_stock_ledger.sql
-- Makes stock bookkeeping exactly-once per order line.
--
-- Before: whether an order's stock had been taken was *inferred* from its
-- status, so some sequences double-counted (double-click Cancel, a line
-- cancelled then un-cancelled, an order cancelled then reopened, two sellers
-- shipping the same POD order at once).
-- After: each order line records how much stock it actually took. Taking and
-- returning stock happen inside these functions, which lock the lines first,
-- so concurrent or repeated calls can never take or return the same stock twice.
--
-- Safe to apply before the matching backend code: the old code does not use
-- these columns/functions. Verified 2026-09-22: 0 orders in the live DB, so no
-- backfill is needed. All statements are idempotent.

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS stock_taken_qty integer NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'order_items_stock_taken_qty_valid') THEN
    ALTER TABLE public.order_items
      ADD CONSTRAINT order_items_stock_taken_qty_valid CHECK (stock_taken_qty >= 0 AND stock_taken_qty <= quantity);
  END IF;
END $$;

-- Take stock for every line of an order that hasn't taken it yet and isn't
-- cancelled. Takes what is available (never below 0); returns units taken.
CREATE OR REPLACE FUNCTION public.take_order_stock(p_order_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $fn$
DECLARE
  r record;
  available integer;
  taken integer;
  total integer := 0;
BEGIN
  FOR r IN
    SELECT id, product_id, quantity FROM public.order_items
    WHERE order_id = p_order_id
      AND stock_taken_qty = 0
      AND fulfillment_status IS DISTINCT FROM 'cancelled'
    ORDER BY id
    FOR UPDATE
  LOOP
    SELECT stock INTO available FROM public.products WHERE id = r.product_id FOR UPDATE;
    taken := LEAST(COALESCE(available, 0), r.quantity);
    IF taken > 0 THEN
      UPDATE public.products SET stock = stock - taken WHERE id = r.product_id;
      UPDATE public.order_items SET stock_taken_qty = taken WHERE id = r.id;
      total := total + taken;
    END IF;
  END LOOP;
  RETURN total;
END;
$fn$;

-- Return the stock an order's lines actually took (all lines, or one line when
-- p_item_id is given). Returns units returned.
CREATE OR REPLACE FUNCTION public.release_order_stock(p_order_id uuid, p_item_id uuid DEFAULT NULL)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $fn$
DECLARE
  r record;
  total integer := 0;
BEGIN
  FOR r IN
    SELECT id, product_id, stock_taken_qty FROM public.order_items
    WHERE order_id = p_order_id
      AND stock_taken_qty > 0
      AND (p_item_id IS NULL OR id = p_item_id)
    ORDER BY id
    FOR UPDATE
  LOOP
    UPDATE public.products SET stock = stock + r.stock_taken_qty WHERE id = r.product_id;
    UPDATE public.order_items SET stock_taken_qty = 0 WHERE id = r.id;
    total := total + r.stock_taken_qty;
  END LOOP;
  RETURN total;
END;
$fn$;

-- Backend (service role) only — same lockdown as the older stock RPCs (015).
REVOKE EXECUTE ON FUNCTION public.take_order_stock(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.release_order_stock(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.take_order_stock(uuid) TO service_role;
GRANT  EXECUTE ON FUNCTION public.release_order_stock(uuid, uuid) TO service_role;

-- ============================================================================
-- ROLLBACK (run manually only if needed)
-- ============================================================================
-- DROP FUNCTION IF EXISTS public.release_order_stock(uuid, uuid);
-- DROP FUNCTION IF EXISTS public.take_order_stock(uuid);
-- ALTER TABLE public.order_items DROP CONSTRAINT IF EXISTS order_items_stock_taken_qty_valid;
-- ALTER TABLE public.order_items DROP COLUMN IF EXISTS stock_taken_qty;
