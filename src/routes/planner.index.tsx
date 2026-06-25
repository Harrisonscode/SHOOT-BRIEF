import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/planner/")({
  component: NewShoot,
});

function NewShoot() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate({ to: "/login", search: { tab: "signin", redirect: "/planner" } as any, replace: true }); return; }
    (async () => {
      const { count } = await supabase.from("shoots").select("*", { count: "exact", head: true });
      if (profile && !profile.is_pro && (count ?? 0) >= 3) {
        toast.error("Free plan limit reached. Upgrade to Pro.");
        navigate({ to: "/billing" });
        return;
      }
      const { data, error } = await supabase
        .from("shoots")
        .insert({ user_id: user.id, name: "Untitled Shoot", shoot_type: profile?.default_shoot_type ?? "Custom" })
        .select()
        .single();
      if (error) { toast.error(error.message); navigate({ to: "/dashboard" }); return; }
      navigate({ to: "/planner/$id", params: { id: data.id }, replace: true });
    })();
  }, [user, profile, loading]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}
