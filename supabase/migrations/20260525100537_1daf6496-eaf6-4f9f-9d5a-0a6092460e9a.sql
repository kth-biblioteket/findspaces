ALTER TABLE public.spaces ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

-- Seed sort_order based on current alphabetical order for existing rows
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY name) * 10 AS rn
  FROM public.spaces
)
UPDATE public.spaces s SET sort_order = o.rn FROM ordered o WHERE s.id = o.id;

CREATE INDEX IF NOT EXISTS spaces_sort_order_idx ON public.spaces (sort_order);