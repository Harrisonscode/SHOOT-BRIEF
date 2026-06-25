import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Camera, Plus, MoreVertical, Trash2 } from "lucide-react";
import { progressOf, TYPE_COLORS, type Shot } from "@/lib/shoot";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Shoot Brief" }] }),
  component: () => (
    <AppShell title="Dashboard"><Dashboard /></AppShell>
  ),
});

type ShootRow = {
  id: string;
  name: string;
  date: string | null;
  location: string | null;
  shoot_type: string | null;
  shot_list: Shot[] | null;
};

function Dashboard() {
  const { user, profile } = useAuth();
  const [shoots, setShoots] = useState<ShootRow[] | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const navigate = useNavigate();

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("shoots")
      .select("id,name,date,location,shoot_type,shot_list")
      .eq("user_id", user.id)
      .order("date", { ascending: true, nullsFirst: false });
    setShoots((data as any) ?? []);
  };

  useEffect(() => { load(); }, [user]);

  const createNew = async () => {
    if (!user) return;
    if (profile && !profile.is_pro && (shoots?.length ?? 0) >= 3) {
      toast.error("Free plan limit reached. Upgrade to Pro for unlimited shoots.");
      navigate({ to: "/billing" });
      return;
    }
    const { data, error } = await supabase
      .from("shoots")
      .insert({ user_id: user.id, name: "Untitled Shoot", shoot_type: profile?.default_shoot_type ?? "Custom" })
      .select()
      .single();
    if (error) return toast.error(error.message);
    navigate({ to: "/planner/$id", params: { id: data.id } });
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this shoot? This cannot be undone.")) return;
    const { error } = await supabase.from("shoots").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Shoot deleted");
    load();
  };

  if (shoots === null) {
    return <div className="space-y-3"><div className="h-8 w-48 bg-muted animate-pulse rounded" /><div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-40 bg-muted animate-pulse rounded-lg" />)}</div></div>;
  }

  const isFree = profile && !profile.is_pro;

  return (
    <div>
      {isFree && (
        <div className="mb-6 rounded-md border bg-primary-soft/40 px-4 py-3 text-sm flex items-center justify-between flex-wrap gap-2">
          <span>You're on the free plan — <strong>{shoots.length} of 3</strong> shoots used.</span>
          <Link to="/billing" className="font-medium text-primary hover:underline">Upgrade →</Link>
        </div>
      )}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Your shoots</h1>
        <button onClick={createNew} className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
          <Plus className="h-4 w-4" /> New shoot
        </button>
      </div>

      {shoots.length === 0 ? (
        <div className="rounded-lg border bg-card shadow-card py-16 px-6 text-center">
          <div className="mx-auto h-14 w-14 rounded-full bg-primary-soft text-primary flex items-center justify-center"><Camera className="h-7 w-7" /></div>
          <h3 className="mt-4 text-lg font-semibold">No shoots yet</h3>
          <p className="text-muted-foreground text-sm mt-1">Start planning your first shoot</p>
          <button onClick={createNew} className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
            <Plus className="h-4 w-4" /> Plan a shoot
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {shoots.map((s) => {
            const p = progressOf(s.shot_list ?? []);
            const c = TYPE_COLORS[s.shoot_type ?? "Custom"] ?? TYPE_COLORS.Custom;
            return (
              <div key={s.id} className="rounded-lg border bg-card shadow-card p-5 group relative">
                <Link to="/planner/$id" params={{ id: s.id }} className="block">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-semibold text-lg leading-tight">{s.name}</h3>
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {s.date ? new Date(s.date).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" }) : "No date"}
                    {s.location ? ` · ${s.location}` : ""}
                  </div>
                  <div className="mt-3">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium ${c.bg} ${c.text}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />{s.shoot_type ?? "Custom"}
                    </span>
                  </div>
                  <div className="mt-4">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                      <span>{p.done} of {p.total} shots</span><span>{p.pct}%</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary transition-all" style={{ width: `${p.pct}%` }} />
                    </div>
                  </div>
                </Link>
                <div className="absolute top-3 right-3">
                  <button onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu === s.id ? null : s.id); }} className="p-1.5 rounded hover:bg-muted">
                    <MoreVertical className="h-4 w-4" />
                  </button>
                  {openMenu === s.id && (
                    <div className="absolute right-0 mt-1 w-32 bg-popover border rounded-md shadow-md z-10 py-1">
                      <button onClick={() => { setOpenMenu(null); remove(s.id); }} className="w-full px-3 py-1.5 text-left text-sm flex items-center gap-2 text-destructive hover:bg-muted">
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
