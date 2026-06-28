-- Add a unique calendar token to each profile for the iCal feed
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS calendar_token UUID UNIQUE DEFAULT gen_random_uuid();

UPDATE public.profiles SET calendar_token = gen_random_uuid() WHERE calendar_token IS NULL;
