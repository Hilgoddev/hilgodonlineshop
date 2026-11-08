-- Per seller order line: safe for orders fulfilled by several vendors.
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS shipping_tracking jsonb;
COMMENT ON COLUMN public.order_items.shipping_tracking IS 'Carrier, trackingNumber, updatedAt and source. Written through authenticated owner/admin API. Future GIG booking/webhooks can populate the same fields.';
NOTIFY pgrst, 'reload schema';
