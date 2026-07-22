ALTER TABLE public.spaces
  ADD COLUMN IF NOT EXISTS book_now_url text,
  ADD COLUMN IF NOT EXISTS book_now_url_en text;