-- 017_restrict_product_images_listing.sql
-- Security advisor: public_bucket_allows_listing.
-- The `product-images` bucket is PUBLIC, so files are served via their public URL
-- (getPublicUrl) without any RLS check. The broad "Public can read product images"
-- SELECT policy on storage.objects is therefore unnecessary and only enables
-- anonymous LISTING/enumeration of every file in the bucket.
--
-- Verified safe: no code calls storage .list()/createSignedUrl; images are referenced
-- by public URL. Uploads (INSERT) and deletes (DELETE) keep their own policies.

DROP POLICY IF EXISTS "Public can read product images" ON storage.objects;
