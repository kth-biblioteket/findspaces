ALTER TABLE public.spaces ADD COLUMN hidden boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_spaces_hidden ON public.spaces(hidden);