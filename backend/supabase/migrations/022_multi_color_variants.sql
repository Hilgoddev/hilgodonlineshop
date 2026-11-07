-- 022_multi_color_variants.sql
-- Lets a buyer put the same product in their cart in more than one colour/size,
-- and lets a seller link a photo to each colour.
--
-- Before: cart_items had UNIQUE (user_id, product_id), so a product could sit in
-- the cart only once — adding "Red" after "Blue" overwrote the colour.
-- After: each cart line is (user, product, variant_key), where variant_key is a
-- stable string built from the chosen options (e.g. "color=#ff0000|size=M";
-- '' for products without options). The backend computes it — see
-- backend/src/lib/variants.js.
--
-- Safe to apply before or after the matching backend: the new backend falls back
-- to the old one-line-per-product behaviour when these columns are missing, and
-- existing rows keep working with variant_key = ''. All statements are idempotent.

-- Optional photo per colour: { "#ff0000": "https://.../red.jpg", ... }.
-- Each URL must also be in products.images (the backend enforces this).
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS color_images jsonb;

ALTER TABLE public.cart_items
  ADD COLUMN IF NOT EXISTS selected_options jsonb,
  ADD COLUMN IF NOT EXISTS variant_key text NOT NULL DEFAULT '';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cart_items_user_id_product_id_key') THEN
    ALTER TABLE public.cart_items DROP CONSTRAINT cart_items_user_id_product_id_key;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cart_items_user_product_variant_key') THEN
    ALTER TABLE public.cart_items
      ADD CONSTRAINT cart_items_user_product_variant_key UNIQUE (user_id, product_id, variant_key);
  END IF;
END $$;

-- ============================================================================
-- ROLLBACK (run manually only if needed — collapses multi-colour cart lines)
-- ============================================================================
-- DELETE FROM public.cart_items a USING public.cart_items b
--   WHERE a.user_id = b.user_id AND a.product_id = b.product_id AND a.id > b.id;
-- ALTER TABLE public.cart_items DROP CONSTRAINT IF EXISTS cart_items_user_product_variant_key;
-- ALTER TABLE public.cart_items ADD CONSTRAINT cart_items_user_id_product_id_key UNIQUE (user_id, product_id);
-- ALTER TABLE public.cart_items DROP COLUMN IF EXISTS variant_key, DROP COLUMN IF EXISTS selected_options;
-- ALTER TABLE public.products DROP COLUMN IF EXISTS color_images;
