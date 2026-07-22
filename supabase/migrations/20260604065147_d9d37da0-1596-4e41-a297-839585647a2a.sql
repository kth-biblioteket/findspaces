ALTER TABLE public.filter_categories ADD COLUMN IF NOT EXISTS title_en text;
ALTER TABLE public.filter_options    ADD COLUMN IF NOT EXISTS label_en text;
ALTER TABLE public.spaces            ADD COLUMN IF NOT EXISTS name_en text;
ALTER TABLE public.spaces            ADD COLUMN IF NOT EXISTS description_en text;
ALTER TABLE public.spaces            ADD COLUMN IF NOT EXISTS notice_en text;
ALTER TABLE public.spaces            ADD COLUMN IF NOT EXISTS located_in_en text;
ALTER TABLE public.spaces            ADD COLUMN IF NOT EXISTS floor_en text;