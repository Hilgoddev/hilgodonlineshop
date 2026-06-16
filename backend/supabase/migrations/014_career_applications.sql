-- 014_career_applications.sql
-- Persists job applications submitted via POST /api/careers/apply.
-- Full applicant-tracking UI is a planned future feature.

CREATE TABLE IF NOT EXISTS public.career_applications (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name    TEXT        NOT NULL,
  email        TEXT        NOT NULL,
  phone        TEXT,
  role_applied TEXT        NOT NULL,
  cover_note   TEXT,
  cv_link      TEXT,
  status       TEXT        NOT NULL DEFAULT 'new'
                           CHECK (status IN ('new', 'reviewing', 'shortlisted', 'rejected', 'hired')),
  applied_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_career_applications_status     ON public.career_applications (status);
CREATE INDEX IF NOT EXISTS idx_career_applications_applied_at ON public.career_applications (applied_at DESC);

ALTER TABLE public.career_applications ENABLE ROW LEVEL SECURITY;
-- Backend uses the service-role key which bypasses RLS; no public policies needed.
