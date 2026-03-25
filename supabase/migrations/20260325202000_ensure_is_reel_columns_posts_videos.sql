/*
  Ensure reel columns exist on `posts` and `videos`.

  Symptoms fixed:
  - Supabase REST 400 "Could not find the 'is_reel' column ... in the schema cache"
  - Frontend ordering queries that depend on `is_reel`
*/

BEGIN;

-- 1) Ensure columns exist with safe defaults
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS is_reel boolean NOT NULL DEFAULT false;

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS video_width integer;

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS video_height integer;

ALTER TABLE public.videos
  ADD COLUMN IF NOT EXISTS is_reel boolean NOT NULL DEFAULT false;

ALTER TABLE public.videos
  ADD COLUMN IF NOT EXISTS video_width integer;

ALTER TABLE public.videos
  ADD COLUMN IF NOT EXISTS video_height integer;

-- 2) Normalize existing nulls (in case column existed but was nullable)
UPDATE public.posts
SET is_reel = false
WHERE is_reel IS NULL;

UPDATE public.videos
SET is_reel = false
WHERE is_reel IS NULL;

-- 3) Enforce constraints for predictable ordering
ALTER TABLE public.posts ALTER COLUMN is_reel SET DEFAULT false;
ALTER TABLE public.posts ALTER COLUMN is_reel SET NOT NULL;

ALTER TABLE public.videos ALTER COLUMN is_reel SET DEFAULT false;
ALTER TABLE public.videos ALTER COLUMN is_reel SET NOT NULL;

-- 4) Backfill based on URL/dimensions where possible
UPDATE public.videos
SET is_reel = true
WHERE video_url IS NOT NULL
  AND video_url ~* 'youtube\.com/shorts/';

UPDATE public.posts
SET is_reel = true
WHERE video_url IS NOT NULL
  AND video_url ~* 'youtube\.com/shorts/'
  AND (content_type = 'فيديو' OR content_type = 'video');

UPDATE public.posts
SET is_reel = true
WHERE video_width IS NOT NULL
  AND video_height IS NOT NULL
  AND video_height > video_width;

UPDATE public.videos
SET is_reel = true
WHERE video_width IS NOT NULL
  AND video_height IS NOT NULL
  AND video_height > video_width;

COMMIT;

