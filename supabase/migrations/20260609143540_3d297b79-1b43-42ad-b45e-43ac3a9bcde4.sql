-- Defense-in-depth: explicitly block anon + authenticated direct access to lead-docs bucket.
-- All legitimate access flows through the upload-lead-doc edge function using the service role,
-- which bypasses RLS by design. These restrictive policies make the denial explicit so any
-- future permissive policy added by mistake cannot grant unintended access.

DROP POLICY IF EXISTS "Deny anon access to lead-docs" ON storage.objects;
DROP POLICY IF EXISTS "Deny authenticated access to lead-docs" ON storage.objects;

CREATE POLICY "Deny anon access to lead-docs"
ON storage.objects
AS RESTRICTIVE
FOR ALL
TO anon
USING (bucket_id <> 'lead-docs')
WITH CHECK (bucket_id <> 'lead-docs');

CREATE POLICY "Deny authenticated access to lead-docs"
ON storage.objects
AS RESTRICTIVE
FOR ALL
TO authenticated
USING (bucket_id <> 'lead-docs')
WITH CHECK (bucket_id <> 'lead-docs');