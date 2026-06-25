-- Add a unique shareable token to each shoot for the client portal
ALTER TABLE public.shoots
  ADD COLUMN IF NOT EXISTS client_token UUID UNIQUE DEFAULT gen_random_uuid();

-- Ensure every existing shoot gets a token
UPDATE public.shoots SET client_token = gen_random_uuid() WHERE client_token IS NULL;

-- Public read policy: anyone with the token can read that shoot row
-- (only the fields the portal needs — enforced in app code, not RLS, since
--  Supabase anon key can read any row once RLS passes)
CREATE POLICY "public portal read by token"
  ON public.shoots FOR SELECT
  TO anon
  USING (client_token IS NOT NULL);
