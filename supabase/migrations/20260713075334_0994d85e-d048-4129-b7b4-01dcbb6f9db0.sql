
-- 1. Add columns
ALTER TABLE public.filter_categories ADD COLUMN IF NOT EXISTS special_kind text;
ALTER TABLE public.filter_options ADD COLUMN IF NOT EXISTS value_key text;
ALTER TABLE public.filter_options ADD COLUMN IF NOT EXISTS is_seed boolean NOT NULL DEFAULT false;
ALTER TABLE public.filter_options ADD COLUMN IF NOT EXISTS hidden boolean NOT NULL DEFAULT false;

-- 2. Drop stale intent category & options (superseded by new arbetssatt category)
DELETE FROM public.filter_options WHERE category = 'intent';
DELETE FROM public.filter_categories WHERE key = 'intent';

-- 3. Seed new special categories
INSERT INTO public.filter_categories (key, title, title_en, style, match_mode, is_single_select, locked, sort_order, special_kind)
VALUES
  ('space_kind', 'Vad letar du efter?', 'What are you looking for?', 'pills', 'any', true, false, 0, 'space_kind'),
  ('arbetssatt', 'Hur vill du arbeta?', 'How do you want to work?', 'pills', 'any', true, false, 1, 'arbetssatt')
ON CONFLICT (key) DO UPDATE SET special_kind = EXCLUDED.special_kind;

-- 4. Seed options for space_kind
INSERT INTO public.filter_options (category, label, label_en, default_icon, sort_order, value_key, is_seed)
VALUES
  ('space_kind', 'En studieplats', 'A study space', 'BookOpen', 10, 'study', true),
  ('space_kind', 'Service & faciliteter', 'Services & facilities', 'Wrench', 20, 'service', true),
  ('space_kind', 'Skapande & paus', 'Creative & break', 'Palette', 30, 'creative', true);

-- 5. Seed options for arbetssatt
INSERT INTO public.filter_options (category, label, label_en, default_icon, sort_order, value_key, is_seed)
VALUES
  ('arbetssatt', 'Enskilt', 'Solo', 'User', 10, 'enskilt', true),
  ('arbetssatt', 'Tillsammans', 'Together', 'Users', 20, 'tillsammans', true),
  ('arbetssatt', 'I grupprum', 'In group room', 'DoorClosed', 30, 'grupprum', true);

-- 6. Replace CHECK on spaces.space_kind with a trigger that validates against filter_options.value_key
DO $$
DECLARE cname text;
BEGIN
  SELECT conname INTO cname FROM pg_constraint
   WHERE conrelid = 'public.spaces'::regclass AND contype = 'c'
     AND pg_get_constraintdef(oid) ILIKE '%space_kind%'
   LIMIT 1;
  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.spaces DROP CONSTRAINT %I', cname);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.validate_space_kind()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.space_kind IS NULL OR NEW.space_kind = '' THEN
    NEW.space_kind := 'study';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.filter_options fo
    JOIN public.filter_categories fc ON fc.key = fo.category
    WHERE fc.special_kind = 'space_kind' AND fo.value_key = NEW.space_kind
  ) THEN
    RAISE EXCEPTION 'Invalid space_kind: %', NEW.space_kind;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS validate_space_kind_trg ON public.spaces;
CREATE TRIGGER validate_space_kind_trg
  BEFORE INSERT OR UPDATE OF space_kind ON public.spaces
  FOR EACH ROW EXECUTE FUNCTION public.validate_space_kind();
