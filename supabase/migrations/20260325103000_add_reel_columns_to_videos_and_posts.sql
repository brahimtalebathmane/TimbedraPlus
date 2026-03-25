-- Reels support: explicit flag + optional dimensions for aspect ratio; ordering in queries.
-- Backfill is_reel for YouTube Shorts URLs.

ALTER TABLE public.videos
  ADD COLUMN IF NOT EXISTS is_reel boolean NOT NULL DEFAULT false;

ALTER TABLE public.videos
  ADD COLUMN IF NOT EXISTS video_width integer;

ALTER TABLE public.videos
  ADD COLUMN IF NOT EXISTS video_height integer;

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS is_reel boolean NOT NULL DEFAULT false;

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS video_width integer;

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS video_height integer;

COMMENT ON COLUMN public.videos.is_reel IS 'Vertical / Shorts-style clip; true when height > width or YouTube Shorts.';
COMMENT ON COLUMN public.posts.is_reel IS 'Vertical video post; set from URL heuristics or measured dimensions.';

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
