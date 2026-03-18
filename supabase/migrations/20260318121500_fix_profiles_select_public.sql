-- Public homepage/articles need to read author profiles via anon client.
-- Fix RLS so profiles are selectable by both anon and authenticated.

DO $$
BEGIN
  DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;

  CREATE POLICY "Profiles are viewable by everyone"
    ON profiles FOR SELECT
    TO public
    USING (true);
END $$;

