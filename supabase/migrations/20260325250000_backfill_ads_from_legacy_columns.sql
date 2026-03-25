-- Backfill ads fields from legacy columns so existing ads keep working.
-- This matters because public visibility depends on `ads.status = 'active'`.

BEGIN;

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

COMMIT;

