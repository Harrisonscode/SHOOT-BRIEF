
CREATE POLICY "users read own inspiration" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'inspiration' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "users insert own inspiration" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'inspiration' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "users delete own inspiration" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'inspiration' AND auth.uid()::text = (storage.foldername(name))[1]);
