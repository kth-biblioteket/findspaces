
-- 1) Tighten analytics_events INSERT policy: remove WITH CHECK (true), add basic guardrails
DROP POLICY IF EXISTS "Anyone can insert analytics events" ON public.analytics_events;
CREATE POLICY "Anyone can insert analytics events"
ON public.analytics_events
FOR INSERT
TO anon, authenticated
WITH CHECK (
  event_type IS NOT NULL
  AND length(event_type) > 0
  AND length(event_type) <= 100
  AND (path IS NULL OR length(path) <= 500)
);

-- 2) Prevent listing of public storage buckets while keeping direct URL access via CDN
DROP POLICY IF EXISTS "Space images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Filter icons publicly readable" ON storage.objects;

-- 3) Restrict SECURITY DEFINER functions so signed-in users cannot invoke them directly.
--    has_role is used only inside RLS/policy evaluation (runs as definer regardless of caller EXECUTE),
--    and rename_filter_option is only called from the admin UI via server context.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;

REVOKE EXECUTE ON FUNCTION public.rename_filter_option(text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rename_filter_option(text, text, text) TO service_role;
