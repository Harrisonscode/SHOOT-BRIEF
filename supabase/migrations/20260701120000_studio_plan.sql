-- Studio plan flag on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_studio BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_plan TEXT; -- 'free' | 'pro' | 'studio'

-- Payment link token already exists on invoices (client_token)
-- Add Stripe payment intent tracking
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT,
  ADD COLUMN IF NOT EXISTS payment_link_enabled BOOLEAN NOT NULL DEFAULT false;

-- Automation rules
CREATE TABLE IF NOT EXISTS public.automation_rules (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  trigger_type TEXT NOT NULL, -- 'before_shoot' | 'after_shoot' | 'delivery_complete' | 'invoice_sent'
  trigger_days INTEGER NOT NULL DEFAULT 0, -- days before/after the trigger event
  action_type  TEXT NOT NULL, -- 'send_email'
  email_subject TEXT NOT NULL,
  email_body   TEXT NOT NULL,
  is_active    BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users manage own automations"
  ON public.automation_rules FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Automation run log (to prevent duplicate sends)
CREATE TABLE IF NOT EXISTS public.automation_runs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_rule_id  UUID NOT NULL REFERENCES public.automation_rules(id) ON DELETE CASCADE,
  shoot_id            UUID REFERENCES public.shoots(id) ON DELETE CASCADE,
  invoice_id          UUID REFERENCES public.invoices(id) ON DELETE CASCADE,
  sent_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  recipient_email     TEXT NOT NULL
);

ALTER TABLE public.automation_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users view own automation runs"
  ON public.automation_runs FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.automation_rules ar
    WHERE ar.id = automation_rule_id AND ar.user_id = auth.uid()
  ));

-- Default automation templates (inserted per user on first setup)
-- These are just examples shown in the UI
