DROP POLICY IF EXISTS "Public can upload lead docs" ON storage.objects;
CREATE POLICY "Public can upload lead docs"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'lead-docs');

DROP POLICY IF EXISTS "Public can read lead docs" ON storage.objects;
CREATE POLICY "Public can read lead docs"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'lead-docs');