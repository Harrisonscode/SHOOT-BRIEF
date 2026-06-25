-- ─── 1. Client fields on shoots ───────────────────────────────────────────────
ALTER TABLE public.shoots
  ADD COLUMN IF NOT EXISTS client_name       TEXT,
  ADD COLUMN IF NOT EXISTS client_email      TEXT,
  ADD COLUMN IF NOT EXISTS client_phone      TEXT,
  ADD COLUMN IF NOT EXISTS contract_status   TEXT NOT NULL DEFAULT 'unsigned',
  ADD COLUMN IF NOT EXISTS payment_status    TEXT NOT NULL DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS client_notes      TEXT,
  ADD COLUMN IF NOT EXISTS gallery_link      TEXT,
  ADD COLUMN IF NOT EXISTS editing_progress  INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS final_delivery_date DATE;

-- ─── 2. Messages table ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shoot_id    UUID REFERENCES public.shoots(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sender      TEXT NOT NULL CHECK (sender IN ('photographer', 'client')),
  body        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users manage own messages"
  ON public.messages FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ─── 3. Increase inspiration image size limit to 50 MB ────────────────────────
UPDATE storage.buckets
SET file_size_limit = 52428800,
    allowed_mime_types = ARRAY[
      'image/jpeg','image/jpg','image/png','image/webp',
      'image/gif','image/tiff','image/heic','image/heif'
    ]
WHERE id = 'inspiration';
