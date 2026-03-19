/*
  Ensure posts has video columns required by the frontend:
  - video_url (text)
  - video_thumbnail (text)

  This prevents Supabase client "schema cache" failures if a deployed DB is behind migrations.
*/

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS video_url text;

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS video_thumbnail text;

