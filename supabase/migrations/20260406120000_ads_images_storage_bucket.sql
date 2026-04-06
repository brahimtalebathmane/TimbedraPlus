-- ads-images: public read, admin-only writes (same pattern as news-images).

BEGIN;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ads-images',
  'ads-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Public read access for ads images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload ads images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update ads images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete ads images" ON storage.objects;

CREATE POLICY "Public read access for ads images"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'ads-images');

CREATE POLICY "Admins can upload ads images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'ads-images'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update ads images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'ads-images'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    bucket_id = 'ads-images'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete ads images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'ads-images'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

COMMIT;
