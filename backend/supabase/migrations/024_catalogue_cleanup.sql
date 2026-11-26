-- 024_catalogue_cleanup.sql
-- Data fix found in the Nov 2026 seller/catalogue audit. Safe to re-run.
--
-- 1. Electronics products filed under subcategories that are not in the
--    taxonomy (frontend/lib/taxonomy.json) never appear when shoppers filter by
--    subcategory. Map them to the closest official subcategory.
UPDATE public.products SET subcategory = 'Audio & Video'        WHERE category = 'electronics' AND subcategory = 'Audio';
UPDATE public.products SET subcategory = 'Tech Accessories'     WHERE category = 'electronics' AND subcategory = 'Accessories';
UPDATE public.products SET subcategory = 'Mobile Phones'        WHERE category = 'electronics' AND subcategory = 'Phones & Tablets';
UPDATE public.products SET subcategory = 'Computer Accessories' WHERE category = 'electronics' AND subcategory = 'Networking';

-- 2. An "original price" at or below the selling price showed as a crossed-out
--    LOWER price. It means "no discount", so clear it. The API now rejects it.
UPDATE public.products SET original_price = NULL WHERE original_price IS NOT NULL AND original_price <= price;
