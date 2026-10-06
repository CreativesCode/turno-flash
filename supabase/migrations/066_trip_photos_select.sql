-- P2-16: duplicating a departure lost its photo, and removing a photo failed
-- silently. The bucket is public for reading by URL, but the Storage API
-- (copy, remove) also needs a SELECT policy on storage.objects, and there
-- was none. Same scope as the other trip-photos policies: owners and admins,
-- only inside their organization's folder.
CREATE POLICY "Owners can read trip photos of their org" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'trip-photos'
    AND (storage.foldername(name))[1] IN (
      SELECT organization_id::text
      FROM public.user_profiles
      WHERE user_id = auth.uid()
        AND role = ANY (ARRAY['admin'::user_role, 'owner'::user_role])
    )
  );
