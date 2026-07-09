ALTER TABLE public.spaces
  ADD COLUMN IF NOT EXISTS space_kind text NOT NULL DEFAULT 'study';

ALTER TABLE public.spaces
  DROP CONSTRAINT IF EXISTS spaces_space_kind_check;

ALTER TABLE public.spaces
  ADD CONSTRAINT spaces_space_kind_check CHECK (space_kind IN ('study','service'));

CREATE INDEX IF NOT EXISTS spaces_space_kind_idx ON public.spaces(space_kind);