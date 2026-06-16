-- 013_return_requests.sql
-- Persists return/refund submissions from POST /api/returns.
-- Full admin return-management UI is a planned future feature.

CREATE TABLE IF NOT EXISTS public.return_requests (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id    TEXT        NOT NULL,
  email       TEXT        NOT NULL,
  reason      TEXT        NOT NULL,
  details     TEXT,
  status      TEXT        NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending', 'approved', 'rejected', 'refunded')),
  admin_notes TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_return_requests_order_id   ON public.return_requests (order_id);
CREATE INDEX IF NOT EXISTS idx_return_requests_status     ON public.return_requests (status);
CREATE INDEX IF NOT EXISTS idx_return_requests_created_at ON public.return_requests (created_at DESC);

ALTER TABLE public.return_requests ENABLE ROW LEVEL SECURITY;
-- Backend uses the service-role key which bypasses RLS; no public policies needed.
