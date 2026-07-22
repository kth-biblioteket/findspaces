UPDATE public.filter_options
SET default_icon = 'Monitor'
WHERE category = 'equipment'
  AND (label = 'Datorer' OR label_en = 'Computers');