-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)

-- Rider applications table
CREATE TABLE IF NOT EXISTS public.rider_applications (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name     text NOT NULL,
  email         text NOT NULL,
  phone         text NOT NULL,
  date_of_birth date,
  state         text,
  vehicle_type  text,
  has_license   boolean DEFAULT false,
  status        text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  admin_notes   text,
  reviewed_at   timestamptz,
  applied_at    timestamptz NOT NULL DEFAULT now()
);

-- Index for admin filtering by status
CREATE INDEX IF NOT EXISTS rider_applications_status_idx ON public.rider_applications(status);
CREATE INDEX IF NOT EXISTS rider_applications_applied_at_idx ON public.rider_applications(applied_at DESC);

-- Newsletter subscribers table
CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text UNIQUE NOT NULL,
  subscribed_at timestamptz NOT NULL DEFAULT now(),
  active        boolean DEFAULT true
);

CREATE INDEX IF NOT EXISTS newsletter_subscribers_email_idx ON public.newsletter_subscribers(email);

-- RLS: service role (backend) can do everything; no public access
ALTER TABLE public.rider_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- Allow the service role (used by backend) full access (service role bypasses RLS by default,
-- but these policies allow the anon/authenticated roles to be locked out)
-- No explicit policies needed for service role — it bypasses RLS.
