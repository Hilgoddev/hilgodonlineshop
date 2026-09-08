-- 015_advisor_security_perf_fixes.sql
-- Fixes Supabase advisor findings (2026-06-20). All statements are idempotent.
--
-- Verified safe before writing:
--   * Stock RPCs are called ONLY from the backend (service role) -> safe to revoke from public roles.
--   * Function bodies schema-qualified so SET search_path = '' cannot break them.
--   * The 4 policy-less tables are backend-driven (service role bypasses RLS); policies are
--     admin-scoped, so nothing new is exposed to anon and admin realtime keeps working.
--   * auth.uid() wrapped as (select auth.uid()) to avoid the auth_rls_initplan perf warning.

-- ============================================================================
-- 1. Pin search_path on functions  (security: function_search_path_mutable)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.decrement_product_stock(p_product_id uuid, p_quantity integer)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $fn$
DECLARE updated_rows int;
BEGIN
  UPDATE public.products SET stock = stock - p_quantity
  WHERE id = p_product_id AND stock >= p_quantity;
  GET DIAGNOSTICS updated_rows = ROW_COUNT;
  RETURN updated_rows > 0;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.increment_product_stock(p_product_id uuid, p_quantity integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $fn$
BEGIN
  UPDATE public.products SET stock = stock + p_quantity WHERE id = p_product_id;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.log_order_status_change()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $fn$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.order_status_history (order_id, old_status, new_status, changed_by_role, metadata)
    VALUES (NEW.id, OLD.status, NEW.status, 'system',
            jsonb_build_object('payment_reference', NEW.payment_reference, 'total_amount', NEW.total_amount));
  END IF;
  RETURN NEW;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.populate_order_item_seller()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $fn$
BEGIN
  SELECT seller_id INTO NEW.seller_id FROM public.products WHERE id = NEW.product_id;
  RETURN NEW;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.sync_seller_store_name()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $fn$
BEGIN
  UPDATE public.profiles SET store_name = NEW.name, updated_at = now() WHERE id = NEW.owner_id;
  RETURN NEW;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $fn$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$fn$;

-- ============================================================================
-- 2. Lock down SECURITY DEFINER stock RPCs
--    (security: anon/authenticated_security_definer_function_executable)
--    Backend calls these with the service role only.
-- ============================================================================
REVOKE EXECUTE ON FUNCTION public.increment_product_stock(uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.decrement_product_stock(uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.increment_product_stock(uuid, integer) TO service_role;
GRANT  EXECUTE ON FUNCTION public.decrement_product_stock(uuid, integer) TO service_role;

-- ============================================================================
-- 3. Covering indexes for foreign keys  (performance: unindexed_foreign_keys)
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_orders_user_id               ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id          ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id        ON public.order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_products_store_id             ON public.products(store_id);
CREATE INDEX IF NOT EXISTS idx_products_category_id          ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_product_id         ON public.cart_items(product_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_items_product_id     ON public.wishlist_items(product_id);
CREATE INDEX IF NOT EXISTS idx_categories_parent_id          ON public.categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_order_id       ON public.payment_events(order_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_user_id       ON public.product_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_seller_applications_reviewed_by ON public.seller_applications(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_seller_payouts_processed_by   ON public.seller_payouts(processed_by);
CREATE INDEX IF NOT EXISTS idx_flash_sales_product_id        ON public.flash_sales(product_id);

-- ============================================================================
-- 4. Drop duplicate index  (performance: duplicate_index)
--    Keep stores_slug_key (the UNIQUE constraint); drop the redundant twin.
-- ============================================================================
DROP INDEX IF EXISTS public.idx_stores_slug;

-- ============================================================================
-- 5. Admin-scoped policies for backend-driven, policy-less tables
--    (security: rls_enabled_no_policy)
-- ============================================================================
ALTER TABLE public.flash_sales ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage flash sales" ON public.flash_sales;
CREATE POLICY "Admins manage flash sales" ON public.flash_sales FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = (select auth.uid()) AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = (select auth.uid()) AND role = 'admin'));

ALTER TABLE public.rider_applications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage rider applications" ON public.rider_applications;
CREATE POLICY "Admins manage rider applications" ON public.rider_applications FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = (select auth.uid()) AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = (select auth.uid()) AND role = 'admin'));

ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage newsletter subscribers" ON public.newsletter_subscribers;
CREATE POLICY "Admins manage newsletter subscribers" ON public.newsletter_subscribers FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = (select auth.uid()) AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = (select auth.uid()) AND role = 'admin'));

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage platform settings" ON public.platform_settings;
CREATE POLICY "Admins manage platform settings" ON public.platform_settings FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = (select auth.uid()) AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = (select auth.uid()) AND role = 'admin'));
