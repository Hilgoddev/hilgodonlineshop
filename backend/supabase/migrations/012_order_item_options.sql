-- Capture the buyer's selected variant options (e.g. size, color) on each order
-- line so they appear in order details for the buyer, seller and admin.
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS selected_options JSONB;
