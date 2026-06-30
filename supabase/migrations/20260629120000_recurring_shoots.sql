-- Recurring shoot series — a parent record describing the recurrence rule.
-- Individual shoots in the series link back via recurrence_id.
CREATE TABLE IF NOT EXISTS public.shoot_recurrences (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  frequency     TEXT NOT NULL,              -- 'weekly', 'monthly', 'custom'
  interval_days INTEGER,                    -- only used when frequency = 'custom'
  occurrences   INTEGER NOT NULL,            -- how many total shoots were generated
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.shoot_recurrences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users manage own recurrences"
  ON public.shoot_recurrences FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Link shoots to their recurrence series
ALTER TABLE public.shoots
  ADD COLUMN IF NOT EXISTS recurrence_id UUID REFERENCES public.shoot_recurrences(id) ON DELETE SET NULL;
