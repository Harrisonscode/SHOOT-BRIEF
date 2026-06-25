-- Fix 1: inspiration_images missing columns
ALTER TABLE public.inspiration_images
  ADD COLUMN IF NOT EXISTS source_type TEXT NOT NULL DEFAULT 'upload',
  ADD COLUMN IF NOT EXISTS gallery TEXT;

-- Fix 2: shoots missing delivered_photos column (causes save errors)
ALTER TABLE public.shoots
  ADD COLUMN IF NOT EXISTS delivered_photos BOOLEAN NOT NULL DEFAULT false;

-- Fix 3: profiles missing business/avatar columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_url    TEXT,
  ADD COLUMN IF NOT EXISTS phone         TEXT,
  ADD COLUMN IF NOT EXISTS website       TEXT,
  ADD COLUMN IF NOT EXISTS business_name TEXT;

-- Fix 4: create inspiration storage bucket if missing
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('inspiration', 'inspiration', false, 10485760, ARRAY['image/jpeg','image/png','image/webp','image/gif'])
ON CONFLICT (id) DO NOTHING;

-- Fix 5: inspiration storage policies
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='objects' AND policyname='users read own inspiration'
  ) THEN
    CREATE POLICY "users read own inspiration"   ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'inspiration' AND auth.uid()::text = (storage.foldername(name))[1]);
    CREATE POLICY "users insert own inspiration" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'inspiration' AND auth.uid()::text = (storage.foldername(name))[1]);
    CREATE POLICY "users delete own inspiration" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'inspiration' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
END $$;
