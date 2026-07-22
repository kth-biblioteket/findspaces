ALTER TABLE public.spaces
  ADD COLUMN IF NOT EXISTS image_alts_en text[] NOT NULL DEFAULT '{}'::text[];