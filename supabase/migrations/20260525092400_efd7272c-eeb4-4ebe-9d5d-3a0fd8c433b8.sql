
CREATE TABLE public.filter_options (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL CHECK (category IN ('intent','noise','equipment','facility')),
  label TEXT NOT NULL,
  icon_url TEXT,
  default_icon TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (category, label)
);

ALTER TABLE public.filter_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Filter options viewable by everyone" ON public.filter_options FOR SELECT USING (true);
CREATE POLICY "Anyone can insert filter options" ON public.filter_options FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update filter options" ON public.filter_options FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete filter options" ON public.filter_options FOR DELETE USING (true);

CREATE TRIGGER set_filter_options_updated_at
BEFORE UPDATE ON public.filter_options
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

INSERT INTO storage.buckets (id, name, public) VALUES ('filter-icons', 'filter-icons', true);

CREATE POLICY "Filter icons publicly readable" ON storage.objects FOR SELECT USING (bucket_id = 'filter-icons');
CREATE POLICY "Anyone can upload filter icons" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'filter-icons');
CREATE POLICY "Anyone can update filter icons" ON storage.objects FOR UPDATE USING (bucket_id = 'filter-icons');
CREATE POLICY "Anyone can delete filter icons" ON storage.objects FOR DELETE USING (bucket_id = 'filter-icons');

INSERT INTO public.filter_options (category, label, default_icon, sort_order) VALUES
  ('intent', 'Enskilt, i avskildhet', NULL, 1),
  ('intent', 'Där andra studerar', NULL, 2),
  ('intent', 'Med vänner', NULL, 3),
  ('intent', 'Med ett grupparbete', NULL, 4),
  ('noise', 'Tyst', 'VolumeX', 1),
  ('noise', 'Samtalston', 'Volume1', 2),
  ('noise', 'Ljudligt', 'Volume2', 3),
  ('equipment', 'Höj- och sänkbara bord', 'Sliders', 1),
  ('equipment', 'Datorer', 'Monitor', 2),
  ('equipment', 'Skärm', 'Tv', 3),
  ('equipment', 'Whiteboard', 'Edit', 4),
  ('equipment', 'Studiebås', 'Columns', 5),
  ('equipment', 'Höj- och sänkbara stolar', 'Armchair', 6),
  ('facility', 'Mat tillåten', 'Utensils', 1),
  ('facility', 'Dagsljus', 'Sun', 2),
  ('facility', 'Skrivare', 'Printer', 3),
  ('facility', 'Toalett', 'Toilet', 4),
  ('facility', 'Tillgänglighetsanpassad toalett', 'Accessibility', 5);
