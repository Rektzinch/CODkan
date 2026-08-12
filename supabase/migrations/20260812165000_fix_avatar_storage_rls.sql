-- Menambahkan kebijakan INSERT untuk folder avatars di bucket listing-media
CREATE POLICY "avatar_owner_insert" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'listing-media' AND 
  (storage.foldername(name))[1] = 'avatars' AND 
  (storage.foldername(name))[2] = (SELECT auth.uid())::text
);

-- Menambahkan kebijakan UPDATE untuk folder avatars di bucket listing-media
CREATE POLICY "avatar_owner_update" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'listing-media' AND 
  (storage.foldername(name))[1] = 'avatars' AND 
  (storage.foldername(name))[2] = (SELECT auth.uid())::text
)
WITH CHECK (
  bucket_id = 'listing-media' AND 
  (storage.foldername(name))[1] = 'avatars' AND 
  (storage.foldername(name))[2] = (SELECT auth.uid())::text
);

-- Menambahkan kebijakan DELETE untuk folder avatars di bucket listing-media
CREATE POLICY "avatar_owner_delete" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'listing-media' AND 
  (storage.foldername(name))[1] = 'avatars' AND 
  (storage.foldername(name))[2] = (SELECT auth.uid())::text
);
