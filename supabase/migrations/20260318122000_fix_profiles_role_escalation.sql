-- Prevent privilege escalation through profiles.role updates/inserts.
-- Only allow:
-- - INSERT: role must be 'user'
-- - UPDATE: role must remain unchanged

DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
END $$;

DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
END $$;

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = id AND
    role = 'user'
  );

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = id
  )
  WITH CHECK (
    auth.uid() = id AND
    role = (SELECT p.role FROM profiles p WHERE p.id = auth.uid())
  );

