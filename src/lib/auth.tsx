import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type Profile = {
  id: string;
  display_name: string | null;
  email: string | null;
  is_pro: boolean;
  is_studio: boolean;
  stripe_plan: string | null;
  stripe_customer_id: string | null;
  dark_mode: boolean;
  default_shoot_type: string | null;
  avatar_url: string | null;
  phone: string | null;
  website: string | null;
  business_name: string | null;
  booking_slug: string | null;
  booking_active: boolean;
  booking_intro: string | null;
  calendar_token: string | null;
  brand_color: string | null;
  logo_url: string | null;
  font_family: string | null;
  business_address: string | null;
  business_city: string | null;
  vat_number: string | null;
  invoice_notes: string | null;
  contract_template: string | null;
};

type AuthCtx = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (uid: string) => {
    const { data } = await (supabase.from("profiles") as any).select("*").eq("id", uid).maybeSingle() as any;
    if (data) setProfile(data as unknown as Profile);
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        setTimeout(() => loadProfile(s.user.id), 0);
      } else {
        setProfile(null);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) loadProfile(data.session.user.id).finally(() => setLoading(false));
      else setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (profile?.dark_mode) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, [profile?.dark_mode]);

  return (
    <Ctx.Provider
      value={{
        user,
        session,
        profile,
        loading,
        refreshProfile: async () => { if (user) await loadProfile(user.id); },
        signOut: async () => { await supabase.auth.signOut(); },
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth outside provider");
  return c;
}
