
-- 1) Storage: add UPDATE policy on inspiration bucket
CREATE POLICY "users update own inspiration"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'inspiration' AND (auth.uid())::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'inspiration' AND (auth.uid())::text = (storage.foldername(name))[1]);

-- 2) Profiles: prevent users from changing privileged columns (is_pro, stripe_customer_id)
-- Service role bypasses RLS and triggers checking auth.uid(); we allow when no auth user (service role context).
CREATE OR REPLACE FUNCTION public.prevent_privileged_profile_updates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only enforce when an end-user JWT is present. Service role / server-side
  -- code runs without auth.uid() and may freely update billing fields.
  IF auth.uid() IS NOT NULL THEN
    IF NEW.is_pro IS DISTINCT FROM OLD.is_pro THEN
      RAISE EXCEPTION 'Not allowed to modify is_pro';
    END IF;
    IF NEW.stripe_customer_id IS DISTINCT FROM OLD.stripe_customer_id THEN
      RAISE EXCEPTION 'Not allowed to modify stripe_customer_id';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_privileged_profile_updates ON public.profiles;
CREATE TRIGGER prevent_privileged_profile_updates
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_privileged_profile_updates();
