-- Additive: keeps all existing products, categories and permissions intact.
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_unisex boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS products_unisex_active_idx ON public.products (is_unisex) WHERE is_active = true AND status = 'approved';
INSERT INTO public.categories (name, slug) SELECT 'Accessories', 'accessories' WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE slug = 'accessories');
INSERT INTO public.categories (name, slug) SELECT 'Beauty & Care', 'beauty' WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE slug = 'beauty');
INSERT INTO public.categories (name, slug) SELECT 'Collectibles', 'collectibles' WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE slug = 'collectibles');
INSERT INTO public.categories (name, slug) SELECT 'Electronics', 'electronics' WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE slug = 'electronics');
INSERT INTO public.categories (name, slug) SELECT 'Gaming', 'gaming' WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE slug = 'gaming');
INSERT INTO public.categories (name, slug) SELECT 'Herbs', 'herbs' WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE slug = 'herbs');
INSERT INTO public.categories (name, slug) SELECT 'Home Supplies', 'home' WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE slug = 'home');
INSERT INTO public.categories (name, slug) SELECT 'Kitchenware', 'kitchen' WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE slug = 'kitchen');
INSERT INTO public.categories (name, slug) SELECT 'Menswear', 'menswear' WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE slug = 'menswear');
INSERT INTO public.categories (name, slug) SELECT 'Shoes', 'shoes' WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE slug = 'shoes');
INSERT INTO public.categories (name, slug) SELECT 'Sports', 'sports' WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE slug = 'sports');
INSERT INTO public.categories (name, slug) SELECT 'Toys', 'toys' WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE slug = 'toys');
INSERT INTO public.categories (name, slug) SELECT 'Womenswear', 'womenswear' WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE slug = 'womenswear');
INSERT INTO public.categories (name, slug) SELECT 'Kids & Baby', 'kids' WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE slug = 'kids');
INSERT INTO public.categories (name, slug) SELECT 'Unisex', 'unisex' WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE slug = 'unisex');
