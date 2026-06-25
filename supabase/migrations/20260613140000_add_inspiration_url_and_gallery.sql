-- Add support for external image URLs (e.g. Pinterest links) and named galleries
ALTER TABLE public.inspiration_images
  ADD COLUMN IF NOT EXISTS source_type TEXT NOT NULL DEFAULT 'upload',
  ADD COLUMN IF NOT EXISTS gallery TEXT;

-- source_type is either 'upload' (stored in Supabase storage, image_url = storage path)
-- or 'url' (external link, e.g. pasted from Pinterest, image_url = full https URL)
