-- Make site categories fixed/read-only.
-- Admins can still assign categories to posts, but cannot create/edit/delete categories.

DROP POLICY IF EXISTS "Only admins can insert categories" ON categories;
DROP POLICY IF EXISTS "Only admins can update categories" ON categories;
DROP POLICY IF EXISTS "Only admins can delete categories" ON categories;

