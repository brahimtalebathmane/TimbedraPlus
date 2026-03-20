-- Safety net for deployments where the `posts` table might be behind migrations.
-- Ensures the admin video-post flow can insert `video_url` + `video_thumbnail`.

BEGIN;

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS video_url text;

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS video_thumbnail text;

COMMIT;

