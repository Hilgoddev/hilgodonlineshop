-- Generalize flash_sales into a campaigns model so the same timed-discount
-- mechanism can power flash sales, Black Friday, Easter, etc. Existing rows
-- default to type 'flash', preserving current behavior.

ALTER TABLE public.flash_sales
  ADD COLUMN IF NOT EXISTS type  TEXT NOT NULL DEFAULT 'flash',
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS theme JSONB;

-- Constrain campaign types (drop+recreate so re-running is safe).
ALTER TABLE public.flash_sales DROP CONSTRAINT IF EXISTS flash_sales_type_check;
ALTER TABLE public.flash_sales
  ADD CONSTRAINT flash_sales_type_check
  CHECK (type IN ('flash', 'black_friday', 'easter'));

CREATE INDEX IF NOT EXISTS idx_flash_sales_type ON public.flash_sales (type);
