-- 019: Fix category mix-ups reported 2026-07-07
--
-- 1) Five cancer-AWARENESS apparel items (t-shirts, a cap, a bucket hat) were
--    uploaded under category='herbs' alongside the herbal "cure" products,
--    which made shirts show on the Herbs category page. Move them to their
--    proper apparel categories. Matched by exact product id (verified against
--    the live DB on 2026-07-07) — never by name pattern.
--
-- 2) The `categories` table (which drives the navbar's All-Categories dropdown
--    via GET /api/categories) had a 'health' row but NO 'herbs' row, while the
--    product taxonomy uses 'herbs'. The nav therefore showed "Health" linking
--    to /products?category=health — a dead page with 0 products. Rename the
--    row so the label and link match the real taxonomy.
--
-- Idempotent: re-running is a no-op.

BEGIN;

-- T-shirts → menswear / Men's Tops
UPDATE products SET category = 'menswear', subcategory = 'Men''s Tops'
WHERE id IN (
  'd726a5cd-fbd2-4e70-96f7-2799e06f3ea4',  -- "Hope Love Cure" Breast Cancer Awareness T-Shirt
  '5c3ccd08-b846-475c-af02-ebee951a10b8',  -- Peace Love Cure" Melanoma Awareness T-Shirt
  'd18feaca-547a-4646-a002-3334726ab39a',  -- Spread the Hope, Find the Cure" T-Shirt
  '6a5a7f64-59d5-4621-b1bc-8592fdca62ab'   -- Ballin for a Cure" Basketball T-Shirt (was status=pending)
) AND category = 'herbs';

-- Cap + bucket hat → accessories / Hats & Caps
UPDATE products SET category = 'accessories', subcategory = 'Hats & Caps'
WHERE id IN (
  '094394c4-66b1-47d2-99bc-d0575a8558bb',  -- "Hope Love Cure" Breast Cancer Awareness Cap
  '6ff84343-ba45-4379-8393-da8d969e8b62'   -- Colon Cancer Awareness Bucket Hat
) AND category = 'herbs';

-- categories table: health → herbs (no existing 'herbs' row, so no conflict)
UPDATE categories SET name = 'Herbs', slug = 'herbs'
WHERE slug = 'health'
  AND NOT EXISTS (SELECT 1 FROM categories WHERE slug = 'herbs');

COMMIT;
