CREATE TABLE public.analytics_events (
  id BIGSERIAL PRIMARY KEY,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  session_id TEXT,
  path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX analytics_events_type_created_idx ON public.analytics_events (event_type, created_at DESC);
CREATE INDEX analytics_events_created_idx ON public.analytics_events (created_at DESC);

GRANT SELECT, INSERT ON public.analytics_events TO anon;
GRANT SELECT, INSERT ON public.analytics_events TO authenticated;
GRANT USAGE ON SEQUENCE public.analytics_events_id_seq TO anon, authenticated;
GRANT ALL ON public.analytics_events TO service_role;
GRANT ALL ON SEQUENCE public.analytics_events_id_seq TO service_role;

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert analytics events"
  ON public.analytics_events FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can read analytics events"
  ON public.analytics_events FOR SELECT
  TO anon, authenticated
  USING (true);
