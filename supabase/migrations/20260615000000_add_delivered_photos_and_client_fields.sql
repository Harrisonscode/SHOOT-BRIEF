-- Add delivered photos (array of storage paths) and client-facing fields to shoots
ALTER TABLE public.shoots
  ADD COLUMN IF NOT EXISTS delivered_photos JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS client_name TEXT,
  ADD COLUMN IF NOT EXISTS client_email TEXT,
  ADD COLUMN IF NOT EXISTS photographer_website TEXT;
