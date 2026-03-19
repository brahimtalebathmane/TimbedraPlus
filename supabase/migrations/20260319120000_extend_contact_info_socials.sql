-- Ensure `contact_info` exists and includes all social fields.
-- This migration is idempotent and safe to re-run.

-- 1) Create table if missing (some environments may not have applied earlier migrations).
CREATE TABLE IF NOT EXISTS public.contact_info (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text,
  phone text,
  whatsapp text,
  facebook text,
  twitter text,
  instagram text,
  youtube text,
  linkedin text,
  snapchat text,
  tiktok text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2) Add any missing columns (if the table already existed).
ALTER TABLE public.contact_info
  ADD COLUMN IF NOT EXISTS linkedin text,
  ADD COLUMN IF NOT EXISTS snapchat text,
  ADD COLUMN IF NOT EXISTS tiktok text;

-- 3) Ensure RLS + policies exist.
ALTER TABLE public.contact_info ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  BEGIN
    CREATE POLICY "Contact is publicly readable"
      ON public.contact_info FOR SELECT
      TO public
      USING (true);
  EXCEPTION WHEN duplicate_object THEN
    -- policy already exists
  END;

  BEGIN
    CREATE POLICY "Only admins can insert contact info"
      ON public.contact_info FOR INSERT
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
    CREATE POLICY "Only admins can update contact info"
      ON public.contact_info FOR UPDATE
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
    CREATE POLICY "Only admins can delete contact info"
      ON public.contact_info FOR DELETE
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

