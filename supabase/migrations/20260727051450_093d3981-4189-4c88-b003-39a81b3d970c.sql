ALTER TABLE public.spaces
  ADD COLUMN IF NOT EXISTS group_booking_label text,
  ADD COLUMN IF NOT EXISTS group_booking_label_en text;