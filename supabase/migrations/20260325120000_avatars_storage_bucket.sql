/*
  Public bucket for user profile avatars.
  Objects are stored under `{user_id}/{uuid}.{ext}` so RLS can restrict writes to the owner.
*/

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  2097152,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  DROP POLICY IF EXISTS "Public read avatars" ON storage.objects;
  DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
  DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
  DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;
END $$;

CREATE POLICY "Public read avatars"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'avatars');

-- Path must be `{auth.uid()}/...` (first path segment).
CREATE POLICY "Users can upload own avatar"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars' AND
    auth.uid() IS NOT NULL AND
    split_part(name, '/', 1) = auth.uid()::text
  );

CREATE POLICY "Users can update own avatar"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars' AND
    auth.uid() IS NOT NULL AND
    split_part(name, '/', 1) = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'avatars' AND
    auth.uid() IS NOT NULL AND
    split_part(name, '/', 1) = auth.uid()::text
  );

CREATE POLICY "Users can delete own avatar"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars' AND
    auth.uid() IS NOT NULL AND
    split_part(name, '/', 1) = auth.uid()::text
  );
