DROP POLICY IF EXISTS "Anyone can read analytics events" ON public.analytics_events;
CREATE POLICY "Authenticated can read analytics events" ON public.analytics_events FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.analytics_events FROM anon;