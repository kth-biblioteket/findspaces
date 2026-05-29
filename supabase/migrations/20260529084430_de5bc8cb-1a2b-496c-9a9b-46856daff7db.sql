-- Convert noise from single text to text[] so a space can have multiple noise levels
ALTER TABLE public.spaces
  ALTER COLUMN noise DROP DEFAULT;

ALTER TABLE public.spaces
  ALTER COLUMN noise TYPE text[]
  USING CASE
    WHEN noise IS NULL OR noise = '' THEN ARRAY[]::text[]
    ELSE ARRAY[noise]::text[]
  END;

ALTER TABLE public.spaces
  ALTER COLUMN noise SET DEFAULT '{}'::text[],
  ALTER COLUMN noise SET NOT NULL;

-- New URL field for "lediga datorer" page
ALTER TABLE public.spaces
  ADD COLUMN IF NOT EXISTS computers_url text;