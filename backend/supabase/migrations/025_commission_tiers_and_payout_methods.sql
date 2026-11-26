-- 025_commission_tiers_and_payout_methods.sql
-- Additive only (new nullable columns), so it is safe to run BEFORE the
-- matching backend deploys; older code simply ignores these columns.
--
-- 1. Commission per order line: 5% for items up to €100, 10% above €100,
--    decided when the order is placed and stored here so earnings never move
--    with exchange rates. NULL = sold before this change (flat 10%).
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS commission_rate numeric(5,4);

-- 2. Payouts: bank transfer (main), crypto or another method; the admin
--    records the transfer reference (bank ref / transaction hash) when paying.
ALTER TABLE public.seller_payouts
  ADD COLUMN IF NOT EXISTS payment_reference text,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz;

-- 3. A seller's saved payout details per method, used to prefill requests:
--    { "default": "bank_transfer", "bank_transfer": {...}, "crypto": {...}, "other": {...} }
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS payout_details jsonb;

-- 4. Sellers are reviewed once (when they apply); after that their products
--    go live without a per-product review. Admins can still reject or
--    deactivate any product, and can switch per-product review back on in
--    Admin → Approvals. Publish what approved sellers already have waiting.
INSERT INTO public.platform_settings (key, value) VALUES ('auto_approve_products', 'true'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = 'true'::jsonb, updated_at = NOW();
UPDATE public.products p SET status = 'approved'
WHERE p.status = 'pending'
  AND EXISTS (SELECT 1 FROM public.profiles s WHERE s.id = p.seller_id AND s.role IN ('seller', 'admin'));

NOTIFY pgrst, 'reload schema';
