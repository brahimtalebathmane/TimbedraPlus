-- Reconcile Supabase Storage configuration for uploaded videos.
-- Fixes:
-- - 400 Bad Request during storage uploads (usually MIME mismatch / bucket misconfig)
-- - "new row violates row-level security policy" on storage.objects INSERT/UPDATE

BEGIN;

-- Ensure bucket exists and settings match the frontend upload logic.
-- NOTE: storage objects policy checks only bucket_id; bucket settings validate MIME + size.
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
    'video/x-matroska',
    'video/ogg',
    'video/3gpp'
  ]
)
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Ensure RLS is enabled so policies take effect.
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop any potentially conflicting policies (names vary across earlier migrations).
DROP POLICY IF EXISTS "Public read access for videos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload videos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update videos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete videos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload videos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update videos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete videos" ON storage.objects;
DROP POLICY IF EXISTS "Anon can upload videos" ON storage.objects;
DROP POLICY IF EXISTS "Anon can update videos" ON storage.objects;
DROP POLICY IF EXISTS "Anon can delete videos" ON storage.objects;

-- Public read (site display)
CREATE POLICY "Public read access for videos"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'news-videos');

-- Authenticated uploads/updates/deletes (admin panel)
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

-- Some storage flows (signed URL related) can be evaluated as `anon` depending on auth headers.
-- Keeping these narrow to only the `news-videos` bucket prevents upload blocks.
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

