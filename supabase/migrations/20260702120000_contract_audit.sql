-- Contract audit trail — every significant event logged
CREATE TABLE IF NOT EXISTS public.contract_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id  UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  event_type   TEXT NOT NULL, -- 'created' | 'sent' | 'viewed' | 'signed'
  occurred_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address   TEXT,
  user_agent   TEXT,
  metadata     JSONB         -- e.g. { signed_name: "Sarah Powell" }
);

ALTER TABLE public.contract_events ENABLE ROW LEVEL SECURITY;

-- Photographers can read events for their own contracts
CREATE POLICY "photographers read own contract events"
  ON public.contract_events FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.contracts c
      WHERE c.id = contract_id AND c.user_id = auth.uid()
    )
  );

-- Anyone (anon) can insert events — needed for client-side view/sign tracking
CREATE POLICY "anyone can insert contract events"
  ON public.contract_events FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Add user_agent column to contracts for the final signing record
ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS signed_user_agent TEXT,
  ADD COLUMN IF NOT EXISTS viewed_at TIMESTAMPTZ;
