-- Ensure Supabase Storage bucket + policies exist for uploaded videos.
-- Fixes "Bucket not found" by idempotently creating/updating the bucket named `news-videos`.
-- Also broadens upload support for common video MIME types and ensures:
-- - Public read access (site can display videos)
-- - Authenticated users can upload/update/delete objects

BEGIN;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'news-videos',
  'news-videos',
  true,
  104857600,
  ARRAY[
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'video/x-m4v',
    'video/x-matroska'
  ]
)
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Make sure RLS is enabled before creating policies.
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  DROP POLICY IF EXISTS "Public read access for videos" ON storage.objects;
  DROP POLICY IF EXISTS "Admins can upload videos" ON storage.objects;
  DROP POLICY IF EXISTS "Admins can update videos" ON storage.objects;
  DROP POLICY IF EXISTS "Admins can delete videos" ON storage.objects;

  DROP POLICY IF EXISTS "Authenticated users can upload videos" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated users can update videos" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated users can delete videos" ON storage.objects;
END $$;

-- Public read access (to display videos on the site)
CREATE POLICY "Public read access for videos"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'news-videos');

-- Authenticated uploads/updates/deletes
CREATE POLICY "Authenticated users can upload videos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'news-videos');

CREATE POLICY "Authenticated users can update videos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'news-videos')
  WITH CHECK (bucket_id = 'news-videos');

CREATE POLICY "Authenticated users can delete videos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'news-videos');

COMMIT;

