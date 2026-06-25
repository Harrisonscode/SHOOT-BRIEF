import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { TYPE_COLORS } from "@/lib/shoot";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/calendar")({
  component: () => <AppShell title="Calendar"><CalendarPage /></AppShell>,
});

function CalendarPage() {
  const { user, profile } = useAuth();
  const [month, setMonth] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const [shoots, setShoots] = useState<Array<{ id: string; name: string; date: string | null; shoot_type: string | null }>>([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("shoots").select("id,name,date,shoot_type");
      setShoots((data as any) ?? []);
    })();
  }, [user]);

  const createOn = async (dateStr: string) => {
    if (!user) return;
    if (profile && !profile.is_pro) {
      const { count } = await supabase.from("shoots").select("*", { count: "exact", head: true });
      if ((count ?? 0) >= 3) { toast.error("Free plan limit reached."); navigate({ to: "/billing" }); return; }
    }
    const { data, error } = await supabase.from("shoots").insert({ user_id: user.id, name: "Untitled Shoot", date: dateStr }).select().single();
    if (error) return toast.error(error.message);
    navigate({ to: "/planner/$id", params: { id: data.id } });
  };

  const year = month.getFullYear();
  const m = month.getMonth();
  const first = new Date(year, m, 1);
  const startOffset = (first.getDay() + 6) % 7; // Monday start
  const daysInMonth = new Date(year, m + 1, 0).getDate();
  const days: Array<Date | null> = [];
  for (let i = 0; i < startOffset; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(new Date(year, m, d));
  while (days.length % 7 !== 0) days.push(null);

  const isToday = (d: Date) => { const t = new Date(); return d.toDateString() === t.toDateString(); };
  const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => { const d = new Date(); d.setDate(1); setMonth(d); }} className="px-3 py-1.5 rounded-md border text-sm hover:bg-muted">Today</button>
          <button onClick={() => setMonth(new Date(year, m-1, 1))} className="p-1.5 rounded-md border hover:bg-muted"><ChevronLeft className="h-4 w-4" /></button>
          <button onClick={() => setMonth(new Date(year, m+1, 1))} className="p-1.5 rounded-md border hover:bg-muted"><ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>

      <div className="rounded-lg border bg-card shadow-card overflow-hidden">
        <div className="grid grid-cols-7 border-b bg-muted/50">
          {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((d) => (
            <div key={d} className="text-xs font-medium text-muted-foreground px-2 py-2 text-center">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((d, i) => {
            if (!d) return <div key={i} className="min-h-24 border-r border-b bg-muted/20" />;
            const dayStr = ymd(d);
            const dayShoots = shoots.filter((s) => s.date === dayStr);
            return (
              <div key={i} className="min-h-24 border-r border-b p-1.5 hover:bg-muted/40 cursor-pointer" onClick={() => dayShoots.length === 0 && createOn(dayStr)}>
                <div className={`text-xs ${isToday(d) ? "h-5 w-5 rounded-full bg-primary text-primary-foreground inline-flex items-center justify-center" : "text-muted-foreground"}`}>{d.getDate()}</div>
                <div className="mt-1 space-y-1">
                  {dayShoots.map((s) => {
                    const c = TYPE_COLORS[s.shoot_type ?? "Custom"] ?? TYPE_COLORS.Custom;
                    return (
                      <button key={s.id} onClick={(e) => { e.stopPropagation(); navigate({ to: "/planner/$id", params: { id: s.id } }); }} className={`block w-full text-left px-1.5 py-0.5 rounded text-[11px] truncate ${c.bg} ${c.text}`}>
                        {s.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
