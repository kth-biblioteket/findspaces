ALTER TABLE public.spaces ADD COLUMN IF NOT EXISTS slug text;
CREATE UNIQUE INDEX IF NOT EXISTS spaces_slug_unique ON public.spaces (slug) WHERE slug IS NOT NULL;
ALTER TABLE public.spaces DROP CONSTRAINT IF EXISTS spaces_slug_format_chk;
ALTER TABLE public.spaces ADD CONSTRAINT spaces_slug_format_chk
  CHECK (slug IS NULL OR slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$');