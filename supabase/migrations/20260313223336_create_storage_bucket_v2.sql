/*
  # Create Storage Bucket for News Images

  1. New Bucket
    - `news-images` (public bucket for storing article images)

  2. Security
    - Enable public access for reading
    - Only authenticated admin users can upload/update/delete
    - Organized structure: posts/YYYY/MM/filename

  3. Important Notes
    - Bucket is public for optimal performance
    - Upload size limit handled by browser compression
    - File organization prevents naming conflicts
*/

-- Create the storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'news-images',
  'news-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DO $$
BEGIN
  DROP POLICY IF EXISTS "Public read access" ON storage.objects;
  DROP POLICY IF EXISTS "Admins can upload images" ON storage.objects;
  DROP POLICY IF EXISTS "Admins can update images" ON storage.objects;
  DROP POLICY IF EXISTS "Admins can delete images" ON storage.objects;
END $$;

-- Allow public read access
CREATE POLICY "Public read access"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'news-images');

-- Allow authenticated admins to upload
CREATE POLICY "Admins can upload images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'news-images' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Allow authenticated admins to update
CREATE POLICY "Admins can update images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'news-images' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Allow authenticated admins to delete
CREATE POLICY "Admins can delete images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'news-images' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );