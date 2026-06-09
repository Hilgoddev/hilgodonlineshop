-- Key/value store for platform-wide settings managed by admins.
CREATE TABLE IF NOT EXISTS public.platform_settings (
  key        TEXT PRIMARY KEY,
  value      JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- When true, products uploaded by sellers go live immediately (status 'approved')
-- instead of requiring admin approval. Defaults to false (require approval).
INSERT INTO public.platform_settings (key, value)
VALUES ('auto_approve_products', 'false'::jsonb)
ON CONFLICT (key) DO NOTHING;
