-- ads: extend schema + RLS to support full advertisement management
-- Fields supported:
--   - id (uuid)
--   - title
--   - media_url (image/video URL)
--   - link
--   - placement (header_banner, sidebar, between_articles, article)
--   - status (active/inactive)
--   - created_at / updated_at
--
-- Notes:
-- - This project historically stored ads with legacy columns: `position`, `image_url`, `is_active`.
-- - We keep those legacy columns for compatibility, but the website/admin now relies on `placement` + `status`.

-- Allow optional legacy fields (video ads can have no image URL).
ALTER TABLE public.ads ALTER COLUMN position DROP NOT NULL;
ALTER TABLE public.ads ALTER COLUMN image_url DROP NOT NULL;

-- Add required columns (no-op if they already exist).
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS media_url text;
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS placement text;
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS status text DEFAULT 'inactive';
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS video_url text;
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Backfill new fields from legacy ones.
UPDATE public.ads
SET
  placement = COALESCE(
    placement,
    CASE
      WHEN position = 'sidebar_top' THEN 'sidebar'
      WHEN position IN ('sidebar', 'sidebar_top') THEN 'sidebar'
      WHEN position IN ('header_banner', 'header') THEN 'header_banner'
      ELSE position
    END
  ),
  status = COALESCE(
    status,
    CASE
      WHEN is_active IS TRUE THEN 'active'
      ELSE 'inactive'
    END
  ),
  media_url = COALESCE(media_url, video_url, image_url),
  updated_at = COALESCE(updated_at, created_at);

-- Defaults for newly inserted ads.
ALTER TABLE public.ads ALTER COLUMN placement SET DEFAULT 'sidebar';
ALTER TABLE public.ads ALTER COLUMN status SET DEFAULT 'inactive';

-- Keep legacy columns in sync so existing code paths don't break.
CREATE OR REPLACE FUNCTION public.ads_sync_legacy_fields()
RETURNS trigger AS $$
BEGIN
  IF NEW.placement IS NOT NULL THEN
    NEW.position := NEW.placement;
  END IF;

  IF NEW.status IS NOT NULL THEN
    NEW.is_active := (NEW.status = 'active');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ads_sync_legacy_fields ON public.ads;
CREATE TRIGGER ads_sync_legacy_fields
BEFORE INSERT OR UPDATE ON public.ads
FOR EACH ROW
EXECUTE FUNCTION public.ads_sync_legacy_fields();

-- updated_at trigger
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

-- RLS: inactive ads must not be visible publicly.
DROP POLICY IF EXISTS "Active ads are viewable by everyone" ON public.ads;
DROP POLICY IF EXISTS "Only admins can view all ads" ON public.ads;

CREATE POLICY "Ads are viewable when active"
  ON public.ads
  FOR SELECT
  TO anon, authenticated
  USING (
    COALESCE(
      status,
      CASE WHEN is_active IS TRUE THEN 'active' ELSE 'inactive' END
    ) = 'active'
  );

-- Admins can see all ads (including inactive) in the admin panel.
CREATE POLICY "Only admins can view all ads"
  ON public.ads
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

