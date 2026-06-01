-- 006: Indexes for the hot products filter/sort columns.
-- The public list and admin /all filter by category/subcategory/seller_id and
-- the active+approved flags, and always sort by created_at. Without these the
-- free-tier DB does sequential scans, which is a big part of the latency.
-- Run manually in the Supabase SQL editor.

create index if not exists idx_products_category       on public.products (category);
create index if not exists idx_products_subcategory    on public.products (subcategory);
create index if not exists idx_products_seller_id      on public.products (seller_id);
create index if not exists idx_products_created_at      on public.products (created_at desc);
create index if not exists idx_products_active_approved on public.products (is_active, status);

-- Case-insensitive name search (ilike '%term%'). Requires pg_trgm.
create extension if not exists pg_trgm;
create index if not exists idx_products_name_trgm on public.products using gin (name gin_trgm_ops);
