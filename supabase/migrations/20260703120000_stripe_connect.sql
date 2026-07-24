ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_connect_account_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_connect_enabled BOOLEAN NOT NULL DEFAULT false;
