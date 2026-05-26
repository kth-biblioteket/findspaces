
ALTER TABLE public.filter_options DROP CONSTRAINT IF EXISTS filter_options_category_check;
ALTER TABLE public.filter_options
  ADD CONSTRAINT filter_options_category_check
  CHECK (category IN ('intent', 'noise', 'equipment', 'facility', 'lokaltyp'));

INSERT INTO public.filter_options (category, label, default_icon, sort_order)
SELECT 'lokaltyp', label, icon, ord FROM (VALUES
  ('Övningssal', 'BookOpen', 10),
  ('Datorsal', 'Monitor', 20),
  ('Grupprum', 'Users', 30),
  ('Öppen studieyta', 'Sun', 40),
  ('Tyst zon', 'VolumeX', 50)
) AS v(label, icon, ord)
WHERE NOT EXISTS (
  SELECT 1 FROM public.filter_options WHERE category = 'lokaltyp' AND filter_options.label = v.label
);
