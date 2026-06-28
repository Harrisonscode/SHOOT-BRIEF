-- ─── Shoot Packages ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.packages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  description   TEXT,
  price         NUMERIC(10,2),
  currency      TEXT NOT NULL DEFAULT 'GBP',
  duration_hours NUMERIC(4,1),
  deliverables  TEXT,   -- e.g. "500 edited photos, 2 hour shoot"
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users manage own packages"
  ON public.packages FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Link a package to a shoot
ALTER TABLE public.shoots
  ADD COLUMN IF NOT EXISTS package_id UUID REFERENCES public.packages(id) ON DELETE SET NULL;

-- ─── Client Reviews ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.reviews (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shoot_id        UUID NOT NULL REFERENCES public.shoots(id) ON DELETE CASCADE,
  photographer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  client_name     TEXT NOT NULL,
  rating          INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body            TEXT,
  approved        BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Photographers can read/update their own reviews
CREATE POLICY "photographers manage own reviews"
  ON public.reviews FOR ALL TO authenticated
  USING (photographer_id = auth.uid())
  WITH CHECK (photographer_id = auth.uid());

-- Anyone can submit a review (anon via client portal)
CREATE POLICY "public can submit reviews"
  ON public.reviews FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Anyone can read approved reviews (for the booking page)
CREATE POLICY "public can read approved reviews"
  ON public.reviews FOR SELECT TO anon
  USING (approved = true);
