-- Booking requests: clients fill in a public form, lands in photographer's inbox
CREATE TABLE IF NOT EXISTS public.booking_requests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  client_name   TEXT NOT NULL,
  client_email  TEXT NOT NULL,
  client_phone  TEXT,
  shoot_type    TEXT,
  preferred_date DATE,
  budget        TEXT,
  location      TEXT,
  message       TEXT,
  status        TEXT NOT NULL DEFAULT 'pending', -- pending, accepted, declined
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.booking_requests ENABLE ROW LEVEL SECURITY;

-- Photographers can read/update their own booking requests
CREATE POLICY "photographers manage own bookings"
  ON public.booking_requests FOR ALL TO authenticated
  USING (photographer_id = auth.uid())
  WITH CHECK (photographer_id = auth.uid());

-- Anyone (anon) can insert a booking request
CREATE POLICY "public can create booking requests"
  ON public.booking_requests FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Add booking_slug to profiles so each photographer has a unique booking URL
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS booking_slug TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS booking_active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS booking_intro TEXT;
