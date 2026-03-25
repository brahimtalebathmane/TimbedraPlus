-- Comments + profiles.avatar_url required by the app

BEGIN;

-- 1) profiles.avatar_url (required by comment avatars)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_url text;

-- Backfill from legacy profiles.avatar where possible.
UPDATE public.profiles
SET avatar_url = avatar
WHERE avatar_url IS NULL
  AND avatar IS NOT NULL;

-- 2) comments table
CREATE TABLE IF NOT EXISTS public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Idempotent: drop/recreate policies.
DO $$
BEGIN
  DROP POLICY IF EXISTS "Comments are viewable by everyone" ON public.comments;
  DROP POLICY IF EXISTS "Users can insert own comments" ON public.comments;
  DROP POLICY IF EXISTS "Admins can delete any comment" ON public.comments;
END $$;

-- Public read (so public article page can display comments).
CREATE POLICY "Comments are viewable by everyone"
  ON public.comments FOR SELECT
  TO anon, authenticated
  USING (true);

-- Authenticated users can insert only for themselves.
CREATE POLICY "Users can insert own comments"
  ON public.comments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Admin can delete any comment.
CREATE POLICY "Admins can delete any comment"
  ON public.comments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
  );

CREATE INDEX IF NOT EXISTS idx_comments_post_id_created_at
  ON public.comments (post_id, created_at);

COMMIT;

