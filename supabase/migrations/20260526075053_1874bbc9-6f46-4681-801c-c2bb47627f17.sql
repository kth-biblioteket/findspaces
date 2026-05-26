
-- Create filter_categories table
CREATE TABLE public.filter_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL UNIQUE,
  title text NOT NULL,
  style text NOT NULL DEFAULT 'pills',
  match_mode text NOT NULL DEFAULT 'all',
  is_single_select boolean NOT NULL DEFAULT false,
  locked boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.filter_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Filter categories viewable by everyone" ON public.filter_categories FOR SELECT USING (true);
CREATE POLICY "Anyone can insert filter categories" ON public.filter_categories FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update filter categories" ON public.filter_categories FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete filter categories" ON public.filter_categories FOR DELETE USING (true);

CREATE TRIGGER set_updated_at_filter_categories
BEFORE UPDATE ON public.filter_categories
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Seed the five existing categories
INSERT INTO public.filter_categories (key, title, style, match_mode, is_single_select, locked, sort_order) VALUES
  ('intent',    'Jag vill arbeta', 'list',  'any', false, true, 10),
  ('noise',     'Ljudnivå',        'pills', 'any', true,  true, 20),
  ('lokaltyp',  'Lokaltyp',        'pills', 'any', false, true, 30),
  ('equipment', 'Utrustning',      'pills', 'all', false, true, 40),
  ('facility',  'Faciliteter',     'pills', 'all', false, true, 50);

-- Add tags jsonb to spaces for arbitrary custom categories
ALTER TABLE public.spaces ADD COLUMN IF NOT EXISTS tags jsonb NOT NULL DEFAULT '{}'::jsonb;
