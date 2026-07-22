
-- Tighten data table write policies to authenticated users only
DROP POLICY IF EXISTS "Anyone can insert spaces" ON public.spaces;
DROP POLICY IF EXISTS "Anyone can update spaces" ON public.spaces;
DROP POLICY IF EXISTS "Anyone can delete spaces" ON public.spaces;
CREATE POLICY "Authenticated can insert spaces" ON public.spaces FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update spaces" ON public.spaces FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can delete spaces" ON public.spaces FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Anyone can insert filter categories" ON public.filter_categories;
DROP POLICY IF EXISTS "Anyone can update filter categories" ON public.filter_categories;
DROP POLICY IF EXISTS "Anyone can delete filter categories" ON public.filter_categories;
CREATE POLICY "Authenticated can insert filter categories" ON public.filter_categories FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update filter categories" ON public.filter_categories FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can delete filter categories" ON public.filter_categories FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Anyone can insert filter options" ON public.filter_options;
DROP POLICY IF EXISTS "Anyone can update filter options" ON public.filter_options;
DROP POLICY IF EXISTS "Anyone can delete filter options" ON public.filter_options;
CREATE POLICY "Authenticated can insert filter options" ON public.filter_options FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update filter options" ON public.filter_options FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can delete filter options" ON public.filter_options FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Anyone can insert app settings" ON public.app_settings;
DROP POLICY IF EXISTS "Anyone can update app settings" ON public.app_settings;
DROP POLICY IF EXISTS "Anyone can delete app settings" ON public.app_settings;
CREATE POLICY "Authenticated can insert app settings" ON public.app_settings FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update app settings" ON public.app_settings FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can delete app settings" ON public.app_settings FOR DELETE TO authenticated USING (true);

-- Tighten storage write policies to authenticated users only
DROP POLICY IF EXISTS "Anyone can upload space images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update space images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete space images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload filter icons" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update filter icons" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete filter icons" ON storage.objects;

CREATE POLICY "Authenticated can upload space images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'space-images');
CREATE POLICY "Authenticated can update space images" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'space-images') WITH CHECK (bucket_id = 'space-images');
CREATE POLICY "Authenticated can delete space images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'space-images');

CREATE POLICY "Authenticated can upload filter icons" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'filter-icons');
CREATE POLICY "Authenticated can update filter icons" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'filter-icons') WITH CHECK (bucket_id = 'filter-icons');
CREATE POLICY "Authenticated can delete filter icons" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'filter-icons');

-- Fix function search_path
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$function$;
