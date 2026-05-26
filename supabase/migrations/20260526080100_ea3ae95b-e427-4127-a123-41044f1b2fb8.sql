
ALTER TABLE public.spaces
  ADD COLUMN IF NOT EXISTS image_alts text[] NOT NULL DEFAULT '{}'::text[];

ALTER TABLE public.spaces
  ALTER COLUMN category DROP NOT NULL;
