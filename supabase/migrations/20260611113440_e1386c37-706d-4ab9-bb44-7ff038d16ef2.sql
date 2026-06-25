
-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  display_name TEXT,
  email TEXT,
  is_pro BOOLEAN NOT NULL DEFAULT false,
  stripe_customer_id TEXT,
  dark_mode BOOLEAN NOT NULL DEFAULT false,
  default_shoot_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile select" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "own profile delete" ON public.profiles FOR DELETE USING (auth.uid() = id);

-- Shoots
CREATE TABLE public.shoots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Untitled Shoot',
  date DATE,
  time TEXT,
  location TEXT,
  shoot_type TEXT,
  status TEXT DEFAULT 'upcoming',
  mood_tags TEXT[] DEFAULT '{}',
  shot_list JSONB DEFAULT '[]'::jsonb,
  gear TEXT[] DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shoots TO authenticated;
GRANT ALL ON public.shoots TO service_role;
ALTER TABLE public.shoots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own shoots all" ON public.shoots FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Inspiration
CREATE TABLE public.inspiration_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  shoot_id UUID REFERENCES public.shoots(id) ON DELETE SET NULL,
  image_url TEXT NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inspiration_images TO authenticated;
GRANT ALL ON public.inspiration_images TO service_role;
ALTER TABLE public.inspiration_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own images all" ON public.inspiration_images FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Feedback
CREATE TABLE public.feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users ON DELETE SET NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.feedback TO authenticated;
GRANT ALL ON public.feedback TO service_role;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own feedback insert" ON public.feedback FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own feedback select" ON public.feedback FOR SELECT USING (auth.uid() = user_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_shoots_updated BEFORE UPDATE ON public.shoots FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
