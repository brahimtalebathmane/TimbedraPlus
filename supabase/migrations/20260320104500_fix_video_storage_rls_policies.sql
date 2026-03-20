-- Robust video Storage (news-videos) bucket + RLS policies.
-- Goal: prevent "new row violates row-level security policy" during upload.

BEGIN;

-- Ensure bucket exists and has correct settings.
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

-- Ensure RLS is enabled (policies below will control access).
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- Drop known policies (idempotent).
  DROP POLICY IF EXISTS "Public read access for videos" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated users can upload videos" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated users can update videos" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated users can delete videos" ON storage.objects;

  -- (Optional but helps signed-upload flows depending on auth context)
  DROP POLICY IF EXISTS "Anon can upload videos" ON storage.objects;
  DROP POLICY IF EXISTS "Anon can update videos" ON storage.objects;
  DROP POLICY IF EXISTS "Anon can delete videos" ON storage.objects;
END $$;

-- Public read (frontend display)
CREATE POLICY "Public read access for videos"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'news-videos');

-- Authenticated upload/update/delete (admin UI)
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

-- Some signed upload/token flows may be evaluated as `anon` on storage endpoints.
-- Keeping these narrow to only our bucket ensures uploads still work.
CREATE POLICY "Anon can upload videos"
  ON storage.objects FOR INSERT
  TO anon
  WITH CHECK (bucket_id = 'news-videos');

CREATE POLICY "Anon can update videos"
  ON storage.objects FOR UPDATE
  TO anon
  USING (bucket_id = 'news-videos')
  WITH CHECK (bucket_id = 'news-videos');

CREATE POLICY "Anon can delete videos"
  ON storage.objects FOR DELETE
  TO anon
  USING (bucket_id = 'news-videos');

COMMIT;

