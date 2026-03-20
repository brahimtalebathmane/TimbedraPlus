BEGIN;

-- Safety: ensure columns exist in case a deployed DB is behind migrations.
ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS video_url text;

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS video_thumbnail text;

-- Extract a YouTube ID from common URL formats and return a thumbnail URL.
CREATE OR REPLACE FUNCTION posts_youtube_thumbnail(video_url text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT
    CASE
      WHEN video_url IS NULL THEN NULL
      ELSE
        'https://img.youtube.com/vi/' ||
        COALESCE(
          substring(video_url from 'v=([0-9A-Za-z_-]{11})'),
          substring(video_url from 'youtu\.be/([0-9A-Za-z_-]{11})'),
          substring(video_url from 'youtube\.com/embed/([0-9A-Za-z_-]{11})'),
          substring(video_url from 'youtube\.com/shorts/([0-9A-Za-z_-]{11})'),
          substring(video_url from 'youtube\.com/live/([0-9A-Za-z_-]{11})')
        ) ||
        '/hqdefault.jpg'
    END;
$$;

-- Keep `posts.video_thumbnail` consistent for "video" content types.
CREATE OR REPLACE FUNCTION trg_posts_set_video_thumbnail()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.content_type IN ('فيديو', 'video') THEN
    IF NEW.video_url IS NOT NULL THEN
      NEW.video_thumbnail := posts_youtube_thumbnail(NEW.video_url);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_posts_video_thumbnail ON posts;
CREATE TRIGGER set_posts_video_thumbnail
BEFORE INSERT OR UPDATE OF video_url, content_type
ON posts
FOR EACH ROW
EXECUTE FUNCTION trg_posts_set_video_thumbnail();

COMMIT;

