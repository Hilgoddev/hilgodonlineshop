-- 020_lock_down_client_writes.sql
-- Closes client-side (anon key + user JWT) write paths that bypass the backend.
-- All statements are idempotent.
--
-- Verified against the live DB on 2026-09-22 before writing:
--   * profiles "Users can update own profile." had no column guard -> any user
--     could set role = 'admin' directly via PostgREST.
--   * orders / order_items allowed direct INSERT with any total_amount, status,
--     unit_price (bypassing server-side price recomputation).
--   * products / stores allowed sellers to UPDATE status (self-approval).
--   * seller_payouts allowed direct INSERT (bypassing the balance check).
--   * The frontend only SELECTs profiles directly (AuthContext.js, login.js);
--     every write goes through the Express backend with the service role,
--     which bypasses RLS -> dropping these policies breaks no app flow.
--   * 0 products with price < 0; 0 sellers with >1 pending payout.

-- ============================================================================
-- 1. Drop client write policies (backend/service role does all writes)
-- ============================================================================
DROP POLICY IF EXISTS "Users can update own profile."             ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile."       ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own orders."        ON public.orders;
DROP POLICY IF EXISTS "Users can insert their own order items."   ON public.order_items;
DROP POLICY IF EXISTS "Sellers can insert their own products."    ON public.products;
DROP POLICY IF EXISTS "Sellers can update their own products."    ON public.products;
DROP POLICY IF EXISTS "Sellers can create their own store."       ON public.stores;
DROP POLICY IF EXISTS "Sellers can update their own store."       ON public.stores;
DROP POLICY IF EXISTS payouts_seller_insert                       ON public.seller_payouts;

-- ============================================================================
-- 2. Defence in depth: privileged profile columns can only change server-side
--    (service_role / postgres), even if a permissive policy is re-added later.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.guard_profile_privileged_columns()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $fn$
BEGIN
  IF current_user IN ('anon', 'authenticated') THEN
    IF TG_OP = 'INSERT' THEN
      NEW.role := 'customer';
    ELSIF NEW.role IS DISTINCT FROM OLD.role
       OR NEW.bank_name IS DISTINCT FROM OLD.bank_name
       OR NEW.bank_account_name IS DISTINCT FROM OLD.bank_account_name
       OR NEW.bank_account_number IS DISTINCT FROM OLD.bank_account_number THEN
      RAISE EXCEPTION 'Not allowed to change privileged profile fields'
        USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS guard_profile_privileged_columns ON public.profiles;
CREATE TRIGGER guard_profile_privileged_columns
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_profile_privileged_columns();

-- ============================================================================
-- 3. Data integrity
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_price_non_negative') THEN
    ALTER TABLE public.products ADD CONSTRAINT products_price_non_negative CHECK (price >= 0);
  END IF;
END $$;

-- One pending payout per seller (closes the check-then-insert race in
-- POST /api/seller/payouts/request).
CREATE UNIQUE INDEX IF NOT EXISTS seller_payouts_one_pending_per_seller
  ON public.seller_payouts (seller_id) WHERE status = 'pending';

-- ============================================================================
-- ROLLBACK (run manually only if needed — restores the pre-020 state)
-- ============================================================================
-- DROP INDEX IF EXISTS public.seller_payouts_one_pending_per_seller;
-- ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_price_non_negative;
-- DROP TRIGGER IF EXISTS guard_profile_privileged_columns ON public.profiles;
-- DROP FUNCTION IF EXISTS public.guard_profile_privileged_columns();
-- CREATE POLICY "Users can update own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id);
-- CREATE POLICY "Users can insert their own profile." ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
-- CREATE POLICY "Users can insert their own orders." ON public.orders FOR INSERT WITH CHECK (auth.uid() = user_id);
-- CREATE POLICY "Users can insert their own order items." ON public.order_items FOR INSERT WITH CHECK (
--   EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid()));
-- CREATE POLICY "Sellers can insert their own products." ON public.products FOR INSERT WITH CHECK (
--   auth.uid() = seller_id AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('seller','admin')));
-- CREATE POLICY "Sellers can update their own products." ON public.products FOR UPDATE USING (
--   auth.uid() = seller_id OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
-- CREATE POLICY "Sellers can create their own store." ON public.stores FOR INSERT WITH CHECK (
--   auth.uid() = owner_id AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('seller','admin')));
-- CREATE POLICY "Sellers can update their own store." ON public.stores FOR UPDATE USING (
--   auth.uid() = owner_id OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
-- CREATE POLICY payouts_seller_insert ON public.seller_payouts FOR INSERT WITH CHECK (auth.uid() = seller_id);
