import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { TYPE_COLORS } from "@/lib/shoot";
import { ChevronLeft, ChevronRight, CalendarDays, Copy, CheckCheck, ExternalLink, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/calendar")({
  component: () => <AppShell title="Calendar"><CalendarPage /></AppShell>,
});

function CalendarPage() {
  const { user, profile } = useAuth();
  const [month, setMonth] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const [shoots, setShoots] = useState<Array<{ id: string; name: string; date: string | null; shoot_type: string | null }>>([]);
  const [showSync, setShowSync] = useState(false);
  const [calToken, setCalToken] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("shoots")
        .select("id,name,date,shoot_type")
        .eq("user_id", user.id);
      setShoots((data as any) ?? []);
    })();
  }, [user]);

  const loadToken = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("calendar_token")
      .eq("id", user.id)
      .single();
    setCalToken((data as any)?.calendar_token ?? null);
  };

  const openSync = async () => {
    await loadToken();
    setShowSync(true);
  };

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
  const startOffset = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, m + 1, 0).getDate();
  const days: Array<Date | null> = [];
  for (let i = 0; i < startOffset; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(new Date(year, m, d));
  while (days.length % 7 !== 0) days.push(null);

  const isToday = (d: Date) => d.toDateString() === new Date().toDateString();
  const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;

  const feedUrl = calToken ? `${window.location.origin}/api/public/calendar/${calToken}` : null;

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const googleCalUrl = feedUrl
    ? `https://www.google.com/calendar/render?cid=${encodeURIComponent(feedUrl.replace("https://", "webcal://"))}`
    : null;

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold">{month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={openSync}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border bg-background hover:bg-muted text-sm font-medium"
          >
            <CalendarDays className="h-4 w-4" /> Sync calendar
          </button>
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

      {/* Sync modal */}
      {showSync && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowSync(false)}>
          <div className="bg-card rounded-xl border shadow-xl max-w-lg w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold">Sync your calendar</h2>
              <button onClick={() => setShowSync(false)} className="p-1.5 rounded hover:bg-muted"><X className="h-5 w-5" /></button>
            </div>
            <p className="text-sm text-muted-foreground mb-5">
              Subscribe to your shoots in Google Calendar, Apple Calendar, or Outlook. Your calendar app will automatically show new and updated shoots.
            </p>

            {!feedUrl ? (
              <div className="text-sm text-muted-foreground">Loading your calendar link…</div>
            ) : (
              <div className="space-y-4">

                {/* Google Calendar */}
                <div className="rounded-lg border bg-muted/30 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">🗓️</span>
                    <span className="font-semibold text-sm">Google Calendar</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">Easiest</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">Click the button below — Google Calendar opens and asks you to subscribe. One click and you're done.</p>
                  <a
                    href={googleCalUrl!}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> Add to Google Calendar
                  </a>
                </div>

                {/* Apple Calendar / Outlook */}
                <div className="rounded-lg border bg-muted/30 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">🍎</span>
                    <span className="font-semibold text-sm">Apple Calendar or Outlook</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    Copy the link below then:
                    <br />• <strong>Apple Calendar:</strong> File → New Calendar Subscription → paste URL
                    <br />• <strong>Outlook:</strong> Add calendar → Subscribe from web → paste URL
                  </p>
                  <div className="flex items-center gap-2 bg-background rounded-lg border px-3 py-2">
                    <span className="text-xs text-muted-foreground truncate flex-1 font-mono">{feedUrl}</span>
                    <button
                      onClick={() => copy(feedUrl, "feed")}
                      className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-muted hover:bg-muted/80 text-xs font-medium"
                    >
                      {copied === "feed" ? <CheckCheck className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
                      {copied === "feed" ? "Copied!" : "Copy"}
                    </button>
                  </div>
                </div>

                {/* webcal link */}
                <div className="rounded-lg border bg-muted/30 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">📅</span>
                    <span className="font-semibold text-sm">Direct subscribe (webcal)</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">Opens your default calendar app directly.</p>
                  <a
                    href={feedUrl.replace("https://", "webcal://")}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border bg-background hover:bg-muted text-sm font-medium"
                  >
                    <CalendarDays className="h-3.5 w-3.5" /> Open in calendar app
                  </a>
                </div>

                <p className="text-xs text-muted-foreground">
                  This link is private — keep it secret. Your calendar app will check for updates roughly every hour.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
