/*
  Analytics: visits log + view counters on posts/videos.
  - Anonymous inserts for public tracking; admins read visits.
  - Trigger increments posts.views / videos.views when a visit references post_id / video_id.
*/

BEGIN;

-- View counters (idempotent)
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS views integer NOT NULL DEFAULT 0;

ALTER TABLE public.videos
  ADD COLUMN IF NOT EXISTS views integer NOT NULL DEFAULT 0;

-- Visits log
CREATE TABLE IF NOT EXISTS public.visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_url text NOT NULL,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  content_type text NOT NULL
    CHECK (content_type IN ('article', 'video', 'page', 'home', 'other')),
  post_id uuid REFERENCES public.posts(id) ON DELETE SET NULL,
  video_id uuid REFERENCES public.videos(id) ON DELETE SET NULL,
  visitor_key text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_visits_created_at ON public.visits (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_visits_category_id ON public.visits (category_id) WHERE category_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_visits_visitor_key ON public.visits (visitor_key) WHERE visitor_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_visits_content_type ON public.visits (content_type);

-- Increment content views when a visit targets a post or video (bypasses RLS via SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.apply_visit_view_counts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.post_id IS NOT NULL THEN
    UPDATE public.posts SET views = COALESCE(views, 0) + 1 WHERE id = NEW.post_id;
  END IF;
  IF NEW.video_id IS NOT NULL THEN
    UPDATE public.videos SET views = COALESCE(views, 0) + 1 WHERE id = NEW.video_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_visits_increment_views ON public.visits;
CREATE TRIGGER trg_visits_increment_views
  AFTER INSERT ON public.visits
  FOR EACH ROW
  EXECUTE FUNCTION public.apply_visit_view_counts();

ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can insert visits" ON public.visits;
CREATE POLICY "Anyone can insert visits"
  ON public.visits FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can read visits" ON public.visits;
CREATE POLICY "Admins can read visits"
  ON public.visits FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

COMMIT;
