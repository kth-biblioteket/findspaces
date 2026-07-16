DROP POLICY IF EXISTS "Authenticated can upload space images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can update space images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can delete space images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can upload filter icons" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can update filter icons" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can delete filter icons" ON storage.objects;

CREATE POLICY "Admins can upload space images" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'space-images' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update space images" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'space-images' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'space-images' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete space images" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'space-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can upload filter icons" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'filter-icons' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update filter icons" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'filter-icons' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'filter-icons' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete filter icons" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'filter-icons' AND public.has_role(auth.uid(), 'admin'));