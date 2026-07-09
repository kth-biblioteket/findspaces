ALTER TABLE public.spaces DROP CONSTRAINT IF EXISTS spaces_space_kind_check;
ALTER TABLE public.spaces ADD CONSTRAINT spaces_space_kind_check CHECK (space_kind IN ('study','service','creative'));