-- Schema alignment + RLS hardening for frontend queries.
-- Fixes observed 400 errors due to missing columns in the deployed schema cache:
-- - `ads.link`
-- - `posts.is_reel`, `posts.video_width`, `posts.video_height`, `posts.video_url`, `posts.video_thumbnail`
-- - `videos.is_reel`
--
-- This migration is idempotent and safe to re-run.

BEGIN;

-- ----------------------------
-- posts columns used by UI
-- ----------------------------
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS video_url text;

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS video_thumbnail text;

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS is_reel boolean NOT NULL DEFAULT false;

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS video_width integer;

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS video_height integer;

-- Used by search + UI
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS search_vector text;

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS author_id uuid;

-- ----------------------------
-- videos columns used by UI
-- ----------------------------
ALTER TABLE public.videos
  ADD COLUMN IF NOT EXISTS is_reel boolean NOT NULL DEFAULT false;

ALTER TABLE public.videos
  ADD COLUMN IF NOT EXISTS video_width integer;

ALTER TABLE public.videos
  ADD COLUMN IF NOT EXISTS video_height integer;

ALTER TABLE public.videos
  ADD COLUMN IF NOT EXISTS thumbnail text;

-- ----------------------------
-- ads columns used by UI
-- ----------------------------
ALTER TABLE public.ads
  ADD COLUMN IF NOT EXISTS link text;

ALTER TABLE public.ads
  ADD COLUMN IF NOT EXISTS title text;

ALTER TABLE public.ads
  ADD COLUMN IF NOT EXISTS media_url text;

ALTER TABLE public.ads
  ADD COLUMN IF NOT EXISTS placement text DEFAULT 'sidebar';

ALTER TABLE public.ads
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'inactive';

ALTER TABLE public.ads
  ADD COLUMN IF NOT EXISTS video_url text;

-- Some deployments may still have legacy image_url.
ALTER TABLE public.ads
  ADD COLUMN IF NOT EXISTS image_url text;

ALTER TABLE public.ads
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

ALTER TABLE public.ads
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Legacy columns referenced by older compatibility SQL.
ALTER TABLE public.ads
  ADD COLUMN IF NOT EXISTS position text;

ALTER TABLE public.ads
  ADD COLUMN IF NOT EXISTS is_active boolean;

COMMIT;

-- Ensure RLS is enabled and policies match frontend expectations.
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;

-- ----------------------------
-- posts policies
-- ----------------------------
DROP POLICY IF EXISTS "Published posts are viewable by everyone" ON public.posts;
CREATE POLICY "Published posts are viewable by everyone"
  ON public.posts FOR SELECT
  TO anon, authenticated
  USING (status = 'published');

DROP POLICY IF EXISTS "Only admins can insert posts" ON public.posts;
CREATE POLICY "Only admins can insert posts"
  ON public.posts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE public.profiles.id = auth.uid()
        AND public.profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Only admins can update posts" ON public.posts;
CREATE POLICY "Only admins can update posts"
  ON public.posts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE public.profiles.id = auth.uid()
        AND public.profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE public.profiles.id = auth.uid()
        AND public.profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Only admins can delete posts" ON public.posts;
CREATE POLICY "Only admins can delete posts"
  ON public.posts FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE public.profiles.id = auth.uid()
        AND public.profiles.role = 'admin'
    )
  );

-- ----------------------------
-- videos policies
-- ----------------------------
DROP POLICY IF EXISTS "Videos are viewable by everyone" ON public.videos;
CREATE POLICY "Videos are viewable by everyone"
  ON public.videos FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Only admins can insert videos" ON public.videos;
CREATE POLICY "Only admins can insert videos"
  ON public.videos FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE public.profiles.id = auth.uid()
        AND public.profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Only admins can update videos" ON public.videos;
CREATE POLICY "Only admins can update videos"
  ON public.videos FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE public.profiles.id = auth.uid()
        AND public.profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE public.profiles.id = auth.uid()
        AND public.profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Only admins can delete videos" ON public.videos;
CREATE POLICY "Only admins can delete videos"
  ON public.videos FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE public.profiles.id = auth.uid()
        AND public.profiles.role = 'admin'
    )
  );

-- ----------------------------
-- ads policies
-- ----------------------------
-- Frontend expects:
-- - Public can see only active ads
-- - Admin can see all ads in admin panel
-- - Admin can insert/update/delete ads
DROP POLICY IF EXISTS "Ads are viewable when active" ON public.ads;
CREATE POLICY "Ads are viewable when active"
  ON public.ads
  FOR SELECT
  TO anon, authenticated
  USING (status = 'active');

DROP POLICY IF EXISTS "Only admins can view all ads" ON public.ads;
CREATE POLICY "Only admins can view all ads"
  ON public.ads
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE public.profiles.id = auth.uid()
        AND public.profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Only admins can insert ads" ON public.ads;
CREATE POLICY "Only admins can insert ads"
  ON public.ads FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE public.profiles.id = auth.uid()
        AND public.profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Only admins can update ads" ON public.ads;
CREATE POLICY "Only admins can update ads"
  ON public.ads FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE public.profiles.id = auth.uid()
        AND public.profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE public.profiles.id = auth.uid()
        AND public.profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Only admins can delete ads" ON public.ads;
CREATE POLICY "Only admins can delete ads"
  ON public.ads FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE public.profiles.id = auth.uid()
        AND public.profiles.role = 'admin'
    )
  );

-- Ensure `updated_at` is maintained for ad updates.
CREATE OR REPLACE FUNCTION public.ads_set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ads_set_updated_at ON public.ads;
CREATE TRIGGER ads_set_updated_at
BEFORE UPDATE ON public.ads
FOR EACH ROW
EXECUTE FUNCTION public.ads_set_updated_at();

