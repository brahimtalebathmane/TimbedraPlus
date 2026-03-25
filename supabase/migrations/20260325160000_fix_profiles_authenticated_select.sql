-- Ensure authenticated users can SELECT profiles.
-- `posts` RLS policies check `profiles.role = 'admin'` via a subquery.
-- If `authenticated` can't read `profiles`, admin inserts/updates will fail
-- with RLS errors even when the profile row exists.

BEGIN;

DROP POLICY IF EXISTS "Profiles are viewable by authenticated" ON profiles;

CREATE POLICY "Profiles are viewable by authenticated"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

-- Defensive: allow creating posts without optional media fields.
ALTER TABLE posts
  ALTER COLUMN image_url DROP NOT NULL;

ALTER TABLE posts
  ALTER COLUMN video_thumbnail DROP NOT NULL;

COMMIT;

