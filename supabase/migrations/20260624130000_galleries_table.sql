-- Named galleries stored independently so they persist before any images are assigned
CREATE TABLE IF NOT EXISTS public.galleries (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);

ALTER TABLE public.galleries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users manage own galleries"
  ON public.galleries FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Make sure the gallery column exists on inspiration_images
ALTER TABLE public.inspiration_images
  ADD COLUMN IF NOT EXISTS source_type TEXT NOT NULL DEFAULT 'upload',
  ADD COLUMN IF NOT EXISTS gallery TEXT;
