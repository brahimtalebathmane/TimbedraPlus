/*
  Adds `ads` table so the Admin Media Library can fetch:
  - ads images (image_url)
  - ads videos (video_url)

  Includes RLS policies:
  - Public read (site can render ads)
  - Admin-only write
*/

CREATE TABLE IF NOT EXISTS ads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url text,
  video_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE ads ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  DROP POLICY IF EXISTS "Ads are viewable by everyone" ON ads;
  DROP POLICY IF EXISTS "Only admins can insert ads" ON ads;
  DROP POLICY IF EXISTS "Only admins can update ads" ON ads;
  DROP POLICY IF EXISTS "Only admins can delete ads" ON ads;
END $$;

-- Public read so the website can display ads.
CREATE POLICY "Ads are viewable by everyone"
  ON ads FOR SELECT
  TO anon, authenticated
  USING (true);

-- Admin-only writes.
CREATE POLICY "Only admins can insert ads"
  ON ads FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Only admins can update ads"
  ON ads FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Only admins can delete ads"
  ON ads FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

