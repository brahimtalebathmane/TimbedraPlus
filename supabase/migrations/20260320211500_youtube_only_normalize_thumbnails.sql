-- Normalize videos/posts video URLs to YouTube watch URLs and
-- auto-generate thumbnail URLs from YouTube IDs.
--
-- This ensures the frontend can rely on iframe-based YouTube embeds
-- and that thumbnails are consistent even for older records.

BEGIN;

-- 1) videos table (dedicated "Videos" page)
WITH parsed AS (
  SELECT
    id,
    COALESCE(
      substring(video_url from 'v=([0-9A-Za-z_-]{11})'),
      substring(video_url from 'youtu\.be/([0-9A-Za-z_-]{11})'),
      substring(video_url from 'youtube\.com/embed/([0-9A-Za-z_-]{11})'),
      substring(video_url from 'youtube\.com/shorts/([0-9A-Za-z_-]{11})'),
      substring(video_url from 'youtube\.com/live/([0-9A-Za-z_-]{11})')
    ) AS youtube_id
  FROM videos
)
UPDATE videos v
SET
  video_url = 'https://www.youtube.com/watch?v=' || parsed.youtube_id,
  thumbnail = 'https://img.youtube.com/vi/' || parsed.youtube_id || '/hqdefault.jpg'
FROM parsed
WHERE v.id = parsed.id
  AND parsed.youtube_id IS NOT NULL;

-- 2) posts table (video content inside articles)
WITH parsed_posts AS (
  SELECT
    id,
    COALESCE(
      substring(video_url from 'v=([0-9A-Za-z_-]{11})'),
      substring(video_url from 'youtu\.be/([0-9A-Za-z_-]{11})'),
      substring(video_url from 'youtube\.com/embed/([0-9A-Za-z_-]{11})'),
      substring(video_url from 'youtube\.com/shorts/([0-9A-Za-z_-]{11})'),
      substring(video_url from 'youtube\.com/live/([0-9A-Za-z_-]{11})')
    ) AS youtube_id
  FROM posts
  WHERE content_type IN ('فيديو', 'video')
    AND video_url IS NOT NULL
)
UPDATE posts p
SET
  video_url = 'https://www.youtube.com/watch?v=' || parsed_posts.youtube_id,
  video_thumbnail = 'https://img.youtube.com/vi/' || parsed_posts.youtube_id || '/hqdefault.jpg'
FROM parsed_posts
WHERE p.id = parsed_posts.id
  AND parsed_posts.youtube_id IS NOT NULL;

COMMIT;

