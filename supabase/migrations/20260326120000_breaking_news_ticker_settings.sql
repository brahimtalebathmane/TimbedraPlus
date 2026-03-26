-- Breaking news ticker settings (singleton-ish row).
-- Public can read settings; only admins can write.

CREATE TABLE IF NOT EXISTS public.ticker_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled boolean NOT NULL DEFAULT true,
  source text NOT NULL DEFAULT 'breaking', -- breaking | latest | category
  category_id uuid NULL REFERENCES public.categories(id) ON DELETE SET NULL,
  item_limit integer NOT NULL DEFAULT 10,
  speed_seconds numeric NOT NULL DEFAULT 28, -- seconds per full loop
  autoplay boolean NOT NULL DEFAULT true,
  show_arrows boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ticker_settings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  BEGIN
    CREATE POLICY "Ticker settings are publicly readable"
      ON public.ticker_settings FOR SELECT
      TO public
      USING (true);
  EXCEPTION WHEN duplicate_object THEN
  END;

  BEGIN
    CREATE POLICY "Only admins can insert ticker settings"
      ON public.ticker_settings FOR INSERT
      TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE public.profiles.id = auth.uid()
            AND public.profiles.role = 'admin'
        )
      );
  EXCEPTION WHEN duplicate_object THEN
  END;

  BEGIN
    CREATE POLICY "Only admins can update ticker settings"
      ON public.ticker_settings FOR UPDATE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE public.profiles.id = auth.uid()
            AND public.profiles.role = 'admin'
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE public.profiles.id = auth.uid()
            AND public.profiles.role = 'admin'
        )
      );
  EXCEPTION WHEN duplicate_object THEN
  END;

  BEGIN
    CREATE POLICY "Only admins can delete ticker settings"
      ON public.ticker_settings FOR DELETE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE public.profiles.id = auth.uid()
            AND public.profiles.role = 'admin'
        )
      );
  EXCEPTION WHEN duplicate_object THEN
  END;
END $$;

