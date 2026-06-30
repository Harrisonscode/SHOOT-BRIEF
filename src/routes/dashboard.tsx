import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Camera, Plus, MoreVertical, Trash2, CheckSquare, Square, X, Inbox, Star, CalendarClock, TrendingUp, Search, AlertTriangle } from "lucide-react";
import { progressOf, TYPE_COLORS, type Shot } from "@/lib/shoot";
import { toast } from "sonner";
import { format, isPast, isToday, isThisWeek, differenceInCalendarDays } from "date-fns";

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
  status: string | null;
  editing_progress: number | null;
  client_name: string | null;
  final_delivery_date: string | null;
};

function Dashboard() {
  const { user, profile } = useAuth();
  const [shoots, setShoots] = useState<ShootRow[] | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pendingBookings, setPendingBookings] = useState(0);
  const [pendingReviews, setPendingReviews] = useState(0);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("shoots")
      .select("id,name,date,location,shoot_type,shot_list,status,editing_progress,client_name,final_delivery_date")
      .eq("user_id", user.id)
      .order("date", { ascending: true, nullsFirst: false });
    setShoots((data as any) ?? []);
  };

  const loadCounts = async () => {
    if (!user) return;
    const [{ count: bookings }, { count: reviews }] = await Promise.all([
      supabase.from("booking_requests").select("*", { count: "exact", head: true }).eq("photographer_id", user.id).eq("status", "pending"),
      supabase.from("reviews").select("*", { count: "exact", head: true }).eq("photographer_id", user.id).eq("approved", false),
    ]);
    setPendingBookings(bookings ?? 0);
    setPendingReviews(reviews ?? 0);
  };

  useEffect(() => { load(); loadCounts(); }, [user]);

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

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const deleteSelected = async () => {
    if (selected.size === 0) return;
    if (!confirm(`Delete ${selected.size} shoot${selected.size !== 1 ? "s" : ""}? This cannot be undone.`)) return;
    const { error } = await supabase.from("shoots").delete().in("id", Array.from(selected));
    if (error) { toast.error(error.message); return; }
    toast.success(`${selected.size} shoot${selected.size !== 1 ? "s" : ""} deleted`);
    setSelected(new Set());
    setSelectMode(false);
    load();
  };

  const deleteCompleted = async () => {
    if (!shoots) return;
    const today = new Date();
    const completed = shoots.filter((s) => {
      if (s.status === "completed") return true;
      if (s.date && isPast(new Date(s.date + "T23:59:59")) && !isToday(new Date(s.date))) return true;
      return false;
    });
    if (completed.length === 0) { toast.error("No completed shoots to delete"); return; }
    if (!confirm(`Delete ${completed.length} completed/past shoot${completed.length !== 1 ? "s" : ""}? This cannot be undone.`)) return;
    const { error } = await supabase.from("shoots").delete().in("id", completed.map((s) => s.id));
    if (error) { toast.error(error.message); return; }
    toast.success(`${completed.length} shoot${completed.length !== 1 ? "s" : ""} deleted`);
    load();
  };

  if (shoots === null) {
    return <div className="space-y-3"><div className="h-8 w-48 bg-muted animate-pulse rounded" /><div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-40 bg-muted animate-pulse rounded-lg" />)}</div></div>;
  }

  const isFree = profile && !profile.is_pro;

  // Derived stats
  const upcoming = shoots
    .filter((s) => s.date && !isPast(new Date(s.date + "T23:59:59")))
    .sort((a, b) => (a.date! < b.date! ? -1 : 1))
    .slice(0, 3);

  const thisWeekCount = shoots.filter((s) => s.date && isThisWeek(new Date(s.date), { weekStartsOn: 1 }) && !isPast(new Date(s.date + "T23:59:59"))).length;

  const activeEditing = shoots.filter((s) => (s.editing_progress ?? 0) > 0 && (s.editing_progress ?? 0) < 100);

  const completedCount = shoots.filter((s) => {
    if (s.status === "completed") return true;
    if (s.date && isPast(new Date(s.date + "T23:59:59")) && !isToday(new Date(s.date))) return true;
    return false;
  }).length;

  const overdueDeliveries = shoots.filter((s) => {
    if (!s.final_delivery_date) return false;
    if ((s.editing_progress ?? 0) >= 100) return false;
    return isPast(new Date(s.final_delivery_date + "T23:59:59"));
  });

  const searchedShoots = search.trim()
    ? shoots.filter((s) => {
        const q = search.trim().toLowerCase();
        return (
          s.name.toLowerCase().includes(q) ||
          (s.client_name ?? "").toLowerCase().includes(q) ||
          (s.location ?? "").toLowerCase().includes(q) ||
          (s.shoot_type ?? "").toLowerCase().includes(q)
        );
      })
    : shoots;

  return (
    <div>
      {isFree && (
        <div className="mb-6 rounded-md border bg-primary-soft/40 px-4 py-3 text-sm flex items-center justify-between flex-wrap gap-2">
          <span>You're on the free plan — <strong>{shoots.length} of 3</strong> shoots used.</span>
          <Link to="/billing" className="font-medium text-primary hover:underline">Upgrade →</Link>
        </div>
      )}

      {/* Overdue delivery alert */}
      {overdueDeliveries.length > 0 && (
        <div className="mb-6 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-destructive mb-2">
            <AlertTriangle className="h-4 w-4" />
            {overdueDeliveries.length} overdue {overdueDeliveries.length !== 1 ? "deliveries" : "delivery"}
          </div>
          <div className="space-y-1">
            {overdueDeliveries.map((s) => (
              <Link key={s.id} to="/planner/$id" params={{ id: s.id }} className="flex items-center justify-between text-sm px-2 py-1 rounded hover:bg-destructive/10 transition-colors">
                <span>{s.name}{s.client_name ? ` · ${s.client_name}` : ""}</span>
                <span className="text-destructive text-xs font-medium">
                  Due {format(new Date(s.final_delivery_date! + "T00:00:00"), "d MMM")} — {s.editing_progress ?? 0}% done
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Stat cards */}
      {shoots.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <StatCard
            icon={<CalendarClock className="h-4 w-4" />}
            label="This week"
            value={String(thisWeekCount)}
            sub="shoots scheduled"
          />
          <StatCard
            icon={<TrendingUp className="h-4 w-4" />}
            label="Editing"
            value={String(activeEditing.length)}
            sub="in progress"
          />
          <Link to="/bookings">
            <StatCard
              icon={<Inbox className="h-4 w-4" />}
              label="Bookings"
              value={String(pendingBookings)}
              sub="awaiting reply"
              highlight={pendingBookings > 0}
            />
          </Link>
          <Link to="/reviews">
            <StatCard
              icon={<Star className="h-4 w-4" />}
              label="Reviews"
              value={String(pendingReviews)}
              sub="to approve"
              highlight={pendingReviews > 0}
            />
          </Link>
        </div>
      )}

      {/* Upcoming shoots strip */}
      {upcoming.length > 0 && (
        <div className="mb-6 rounded-lg border bg-card shadow-card p-4">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Coming up</h2>
          <div className="space-y-2">
            {upcoming.map((s) => {
              const days = s.date ? differenceInCalendarDays(new Date(s.date + "T00:00:00"), new Date()) : null;
              return (
                <Link key={s.id} to="/planner/$id" params={{ id: s.id }} className="flex items-center justify-between gap-3 px-3 py-2 rounded-md hover:bg-muted transition-colors">
                  <div className="min-w-0">
                    <span className="font-medium text-sm">{s.name}</span>
                    {s.client_name && <span className="text-muted-foreground text-sm"> · {s.client_name}</span>}
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {days === 0 ? "Today" : days === 1 ? "Tomorrow" : s.date ? format(new Date(s.date + "T00:00:00"), "d MMM") : ""}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Your shoots</h1>
        <div className="flex items-center gap-2 flex-wrap">
          {selectMode ? (
            <>
              <span className="text-sm text-muted-foreground">{selected.size} selected</span>
              <button
                onClick={deleteSelected}
                disabled={selected.size === 0}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-destructive/30 text-destructive hover:bg-destructive/10 text-sm font-medium disabled:opacity-40"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete selected
              </button>
              <button
                onClick={() => { setSelectMode(false); setSelected(new Set()); }}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border bg-background hover:bg-muted text-sm"
              >
                <X className="h-3.5 w-3.5" /> Cancel
              </button>
            </>
          ) : (
            <>
              {shoots.length > 0 && (
                <>
                  <button
                    onClick={deleteCompleted}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border bg-background hover:bg-muted text-sm"
                    title="Delete all completed or past shoots"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Clear completed{completedCount > 0 ? ` (${completedCount})` : ""}
                  </button>
                  <button
                    onClick={() => setSelectMode(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border bg-background hover:bg-muted text-sm"
                  >
                    <CheckSquare className="h-3.5 w-3.5" /> Select
                  </button>
                </>
              )}
              <button onClick={createNew} className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
                <Plus className="h-4 w-4" /> New shoot
              </button>
            </>
          )}
        </div>
      </div>

      {shoots.length > 0 && (
        <div className="relative mb-5">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by shoot name, client, location, or type…"
            className="w-full pl-9 pr-9 py-2.5 rounded-md border bg-card shadow-card text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-muted">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>
      )}

      {shoots.length === 0 ? (
        <div className="rounded-lg border bg-card shadow-card py-16 px-6 text-center">
          <div className="mx-auto h-14 w-14 rounded-full bg-primary-soft text-primary flex items-center justify-center"><Camera className="h-7 w-7" /></div>
          <h3 className="mt-4 text-lg font-semibold">No shoots yet</h3>
          <p className="text-muted-foreground text-sm mt-1">Start planning your first shoot</p>
          <button onClick={createNew} className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
            <Plus className="h-4 w-4" /> Plan a shoot
          </button>
        </div>
      ) : searchedShoots.length === 0 ? (
        <div className="rounded-lg border bg-card shadow-card py-16 px-6 text-center">
          <Search className="h-8 w-8 mx-auto text-muted-foreground" />
          <h3 className="mt-3 font-semibold">No shoots match "{search}"</h3>
          <p className="text-muted-foreground text-sm mt-1">Try a different name, client, or location</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {searchedShoots.map((s) => {
            const p = progressOf(s.shot_list ?? []);
            const c = TYPE_COLORS[s.shoot_type ?? "Custom"] ?? TYPE_COLORS.Custom;
            const isSelected = selected.has(s.id);
            const cardInner = (
              <>
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-semibold text-lg leading-tight">{s.name}</h3>
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {s.date ? new Date(s.date).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" }) : "No date"}
                  {s.location ? ` · ${s.location}` : ""}
                </div>
                <div className="mt-3 flex items-center gap-2 flex-wrap">
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium ${c.bg} ${c.text}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />{s.shoot_type ?? "Custom"}
                  </span>
                  {(s.editing_progress ?? 0) > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
                      Editing {s.editing_progress}%
                    </span>
                  )}
                </div>
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                    <span>{p.done} of {p.total} shots</span><span>{p.pct}%</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary transition-all" style={{ width: `${p.pct}%` }} />
                  </div>
                </div>
              </>
            );
            return (
              <div key={s.id} className={`rounded-lg border bg-card shadow-card p-5 group relative transition-all ${isSelected ? "ring-2 ring-primary border-primary/40" : ""}`}>
                {selectMode ? (
                  <button onClick={() => toggleSelect(s.id)} className="block w-full text-left">
                    <div className="absolute top-3 right-3">
                      {isSelected ? <CheckSquare className="h-5 w-5 text-primary" /> : <Square className="h-5 w-5 text-muted-foreground" />}
                    </div>
                    {cardInner}
                  </button>
                ) : (
                  <>
                    <Link to="/planner/$id" params={{ id: s.id }} className="block">
                      {cardInner}
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
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, sub, highlight }: { icon: React.ReactNode; label: string; value: string; sub: string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg border bg-card shadow-card p-4 hover:border-primary/30 transition-colors cursor-pointer ${highlight ? "border-primary/30 bg-primary-soft/20" : ""}`}>
      <div className={`flex items-center gap-1.5 text-xs font-medium ${highlight ? "text-primary" : "text-muted-foreground"}`}>
        {icon} {label}
      </div>
      <div className="text-2xl font-bold mt-1">{value}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>
    </div>
  );
}
