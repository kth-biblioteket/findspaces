
CREATE TABLE public.spaces (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  intent TEXT[] NOT NULL DEFAULT '{}',
  noise TEXT NOT NULL DEFAULT 'Tyst',
  equipment TEXT[] NOT NULL DEFAULT '{}',
  facilities TEXT[] NOT NULL DEFAULT '{}',
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.spaces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Spaces are viewable by everyone"
  ON public.spaces FOR SELECT USING (true);

CREATE POLICY "Anyone can insert spaces"
  ON public.spaces FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update spaces"
  ON public.spaces FOR UPDATE USING (true);

CREATE POLICY "Anyone can delete spaces"
  ON public.spaces FOR DELETE USING (true);

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER spaces_updated_at
  BEFORE UPDATE ON public.spaces
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

INSERT INTO storage.buckets (id, name, public) VALUES ('space-images', 'space-images', true);

CREATE POLICY "Space images are publicly accessible"
  ON storage.objects FOR SELECT USING (bucket_id = 'space-images');

CREATE POLICY "Anyone can upload space images"
  ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'space-images');

CREATE POLICY "Anyone can update space images"
  ON storage.objects FOR UPDATE USING (bucket_id = 'space-images');

CREATE POLICY "Anyone can delete space images"
  ON storage.objects FOR DELETE USING (bucket_id = 'space-images');
