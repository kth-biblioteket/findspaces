
ALTER TABLE public.spaces
  ADD COLUMN IF NOT EXISTS images text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS map_url text,
  ADD COLUMN IF NOT EXISTS booking_url text,
  ADD COLUMN IF NOT EXISTS lokaltyp text[] NOT NULL DEFAULT '{}';

CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "App settings viewable by everyone" ON public.app_settings;
CREATE POLICY "App settings viewable by everyone" ON public.app_settings FOR SELECT USING (true);
DROP POLICY IF EXISTS "Anyone can insert app settings" ON public.app_settings;
CREATE POLICY "Anyone can insert app settings" ON public.app_settings FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Anyone can update app settings" ON public.app_settings;
CREATE POLICY "Anyone can update app settings" ON public.app_settings FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Anyone can delete app settings" ON public.app_settings;
CREATE POLICY "Anyone can delete app settings" ON public.app_settings FOR DELETE USING (true);

INSERT INTO public.app_settings (key, value) VALUES
  ('title_intent', 'Jag vill arbeta'),
  ('title_noise', 'Ljudnivå'),
  ('title_equipment', 'Utrustning'),
  ('title_facility', 'Faciliteter'),
  ('title_lokaltyp', 'Lokaltyp')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.filter_options (category, label, default_icon, sort_order) VALUES
  ('lokaltyp', 'Övningssal', 'BookOpen', 10),
  ('lokaltyp', 'Datorsal', 'Monitor', 20),
  ('lokaltyp', 'Grupprum', 'Users', 30),
  ('lokaltyp', 'Öppen studieyta', 'Sun', 40),
  ('lokaltyp', 'Tyst zon', 'VolumeX', 50)
ON CONFLICT DO NOTHING;
