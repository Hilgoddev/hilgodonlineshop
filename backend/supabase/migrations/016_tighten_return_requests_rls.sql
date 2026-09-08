-- 016_tighten_return_requests_rls.sql
-- Removes an overly-permissive INSERT policy that let ANY anon client write
-- return_requests directly via PostgREST, bypassing the backend checks in
-- POST /api/returns (which already requires login, verifies the order belongs
-- to the user, matches their email, and checks the order status).
--
-- Returns are submitted only through that backend route (service role, bypasses
-- RLS), so no anon/authenticated policy is needed. Admins get an explicit
-- manage policy so the table is not "RLS enabled, no policy".

DROP POLICY IF EXISTS "Anyone can submit a return request" ON public.return_requests;

ALTER TABLE public.return_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage return requests" ON public.return_requests;
CREATE POLICY "Admins manage return requests" ON public.return_requests FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = (select auth.uid()) AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = (select auth.uid()) AND role = 'admin'));
