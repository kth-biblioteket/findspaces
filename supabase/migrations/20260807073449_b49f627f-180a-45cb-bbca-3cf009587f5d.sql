CREATE POLICY "Public can read space images"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'space-images');

CREATE POLICY "Public can read filter icons"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'filter-icons');