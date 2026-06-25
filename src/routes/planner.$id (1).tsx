import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { SHOOT_TYPES, MOODS, GEAR, SHOT_TAGS, TEMPLATES, progressOf, newId, type Shot } from "@/lib/shoot";
import { Check, Plus, Trash2, X, LayoutTemplate, AlertTriangle, Lock, Calendar as CalendarIcon, Clock, FileDown, Share2, Copy, CheckCheck } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { generateShootBriefPdf, generateClientReportPdf, fetchAvatarAsDataUrl } from "@/lib/pdf";

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));

const formatHourLabel = (h: string) => {
  const hour = parseInt(h, 10);
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour} ${period}`;
};

export const Route = createFileRoute("/planner/$id")({
  component: () => <AppShell title="Planner"><Planner /></AppShell>,
});

type Shoot = {
  id: string;
  name: string;
  date: string | null;
  time: string | null;
  location: string | null;
  shoot_type: string | null;
  status: string | null;
  mood_tags: string[] | null;
  shot_list: Shot[] | null;
  gear: string[] | null;
  notes: string | null;
  // Client fields
  client_name: string | null;
  client_email: string | null;
  client_phone: string | null;
  contract_status: string | null;
  payment_status: string | null;
  client_notes: string | null;
  gallery_link: string | null;
  editing_progress: number | null;
  final_delivery_date: string | null;
  client_token: string | null;
};

function Planner() {
  const { id } = Route.useParams();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [shoot, setShoot] = useState<Shoot | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [showTemplate, setShowTemplate] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipSave = useRef(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from("shoots").select("*").eq("id", id).maybeSingle();
      if (error || !data) { setNotFound(true); return; }
      skipSave.current = true;
      setShoot({ ...data, shot_list: Array.isArray(data.shot_list) ? data.shot_list : [], mood_tags: Array.isArray(data.mood_tags) ? data.mood_tags : [], gear: Array.isArray(data.gear) ? data.gear : [] } as any);
    })();
  }, [id]);

  // Auto-save debounced
  useEffect(() => {
    if (!shoot) return;
    if (skipSave.current) { skipSave.current = false; return; }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const { error } = await supabase
        .from("shoots")
        .update({
          name: shoot.name,
          date: shoot.date,
          time: shoot.time,
          location: shoot.location,
          shoot_type: shoot.shoot_type,
          status: shoot.status,
          mood_tags: shoot.mood_tags,
          shot_list: shoot.shot_list as any,
          gear: shoot.gear,
          notes: shoot.notes,
          client_name: shoot.client_name,
          client_email: shoot.client_email,
          client_phone: shoot.client_phone,
          contract_status: shoot.contract_status,
          payment_status: shoot.payment_status,
          client_notes: shoot.client_notes,
          gallery_link: shoot.gallery_link,
          editing_progress: shoot.editing_progress,
          final_delivery_date: shoot.final_delivery_date,
        } as any)
        .eq("id", shoot.id);
      if (error) toast.error("Save failed: " + error.message);
      else toast.success("Saved", { duration: 1200 });
    }, 800);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [shoot]);

  const update = useCallback(<K extends keyof Shoot>(k: K, v: Shoot[K]) => {
    setShoot((s) => s ? { ...s, [k]: v } : s);
  }, []);

  const applyTemplate = (name: string) => {
    const t = TEMPLATES[name];
    if (!shoot) return;
    setShoot({
      ...shoot,
      shoot_type: name,
      mood_tags: t.moods,
      shot_list: t.shots.map((text) => ({ id: newId(), text, tag: "Custom", done: false })),
    });
    setShowTemplate(false);
    toast.success(`${name} template applied`);
  };

  if (notFound) return <div className="text-center py-16"><h2 className="text-xl font-semibold">Shoot not found</h2><button onClick={() => navigate({ to: "/dashboard" })} className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md">Back to dashboard</button></div>;
  if (!shoot) return <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-40 bg-muted animate-pulse rounded-lg" />)}</div>;

  const isPro = !!profile?.is_pro;

  const saveNow = async () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    const { error } = await supabase
      .from("shoots")
      .update({
        name: shoot.name,
        date: shoot.date,
        time: shoot.time,
        location: shoot.location,
        shoot_type: shoot.shoot_type,
        status: shoot.status,
        mood_tags: shoot.mood_tags,
        shot_list: shoot.shot_list as any,
        gear: shoot.gear,
        notes: shoot.notes,
        client_name: shoot.client_name,
        client_email: shoot.client_email,
        client_phone: shoot.client_phone,
        contract_status: shoot.contract_status,
        payment_status: shoot.payment_status,
        client_notes: shoot.client_notes,
        gallery_link: shoot.gallery_link,
        editing_progress: shoot.editing_progress,
        final_delivery_date: shoot.final_delivery_date,
      } as any)
      .eq("id", shoot.id);
    if (error) { toast.error("Save failed: " + error.message); return; }
    toast.success("Shoot saved");
    navigate({ to: "/dashboard" });
  };

  const cancelShoot = async () => {
    const isUntouched =
      shoot.name === "Untitled Shoot" &&
      !shoot.location &&
      !shoot.date &&
      (shoot.mood_tags?.length ?? 0) === 0 &&
      (shoot.shot_list?.length ?? 0) === 0 &&
      (shoot.gear?.length ?? 0) === 0 &&
      !shoot.notes;

    if (isUntouched) {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      const { error } = await supabase.from("shoots").delete().eq("id", shoot.id);
      if (error) { toast.error(error.message); return; }
    }
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-20">
      <div className="flex items-start justify-between gap-3">
        <input
          value={shoot.name}
          onChange={(e) => update("name", e.target.value)}
          className="flex-1 text-3xl font-bold bg-transparent border-0 focus:outline-none focus:ring-0 px-0"
          placeholder="Shoot name"
        />
        <button onClick={() => setShowTemplate(true)} className="shrink-0 inline-flex items-center gap-2 px-3 py-2 rounded-md border bg-background hover:bg-muted text-sm">
          <LayoutTemplate className="h-4 w-4" /> Use a template
        </button>
        <button
          onClick={async () => {
            if (!isPro) { toast.error("PDF export is a Pro feature. Upgrade to send branded briefs to clients."); return; }
            const avatarDataUrl = profile?.avatar_url ? await fetchAvatarAsDataUrl(profile.avatar_url) : null;
            generateShootBriefPdf(
              {
                name: shoot.name,
                date: shoot.date,
                time: shoot.time,
                location: shoot.location,
                shoot_type: shoot.shoot_type,
                status: shoot.status,
                mood_tags: shoot.mood_tags,
                shot_list: shoot.shot_list,
                gear: shoot.gear,
                notes: shoot.notes,
              },
              {
                name: profile?.display_name ?? "",
                email: profile?.email ?? user?.email ?? "",
                businessName: profile?.business_name ?? null,
                phone: profile?.phone ?? null,
                website: profile?.website ?? null,
                avatarDataUrl,
              }
            );
          }}
          className="shrink-0 inline-flex items-center gap-2 px-3 py-2 rounded-md border bg-background hover:bg-muted text-sm"
        >
          {isPro ? <FileDown className="h-4 w-4" /> : <Lock className="h-4 w-4" />} Export PDF
        </button>
        <button
          onClick={async () => {
            if (!isPro) { toast.error("PDF export is a Pro feature."); return; }
            const avatarDataUrl = profile?.avatar_url ? await fetchAvatarAsDataUrl(profile.avatar_url) : null;
            generateClientReportPdf(
              {
                name: shoot.name,
                date: shoot.date,
                location: shoot.location,
                shoot_type: shoot.shoot_type,
                client_name: shoot.client_name,
                client_email: shoot.client_email,
                client_phone: shoot.client_phone,
                contract_status: shoot.contract_status,
                payment_status: shoot.payment_status,
                client_notes: shoot.client_notes,
                gallery_link: shoot.gallery_link,
                editing_progress: shoot.editing_progress,
                final_delivery_date: shoot.final_delivery_date,
              },
              {
                name: profile?.display_name ?? "",
                email: profile?.email ?? user?.email ?? "",
                businessName: profile?.business_name ?? null,
                phone: profile?.phone ?? null,
                website: profile?.website ?? null,
                avatarDataUrl,
              }
            );
          }}
          className="shrink-0 inline-flex items-center gap-2 px-3 py-2 rounded-md border bg-background hover:bg-muted text-sm"
        >
          {isPro ? <FileDown className="h-4 w-4" /> : <Lock className="h-4 w-4" />} Client Report
        </button>
      </div>

      <ShootDetails shoot={shoot} update={update} />
      <ClientDetails shoot={shoot} update={update} />
      <LightTimes location={shoot.location ?? ""} date={shoot.date ?? ""} shootType={shoot.shoot_type ?? ""} />
      <WeatherCard location={shoot.location ?? ""} date={shoot.date ?? ""} />
      <MoodTags value={shoot.mood_tags ?? []} onChange={(v) => update("mood_tags", v)} />
      <ShotList value={shoot.shot_list ?? []} onChange={(v) => update("shot_list", v)} />
      <GearChecklist value={shoot.gear ?? []} onChange={(v) => update("gear", v)} isPro={isPro} />
      <NotesCard value={shoot.notes ?? ""} onChange={(v) => update("notes", v)} />

      {showTemplate && (
        <TemplateModal
          onClose={() => setShowTemplate(false)}
          onPick={applyTemplate}
          hasData={(shoot.shot_list?.length ?? 0) > 0 || (shoot.mood_tags?.length ?? 0) > 0}
          isPro={isPro}
        />
      )}

      <div className="fixed bottom-0 left-0 right-0 md:left-60 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 px-4 sm:px-6 py-3 flex items-center justify-end gap-3 z-40">
        <button
          onClick={cancelShoot}
          className="px-4 py-2 rounded-md border bg-background hover:bg-muted text-sm font-medium"
        >
          Cancel
        </button>
        <button
          onClick={saveNow}
          className="px-4 py-2 rounded-md bg-primary text-primary-foreground hover:opacity-90 text-sm font-medium"
        >
          Save shoot
        </button>
      </div>
    </div>
  );
}

function ClientDetails({ shoot, update }: { shoot: Shoot; update: <K extends keyof Shoot>(k: K, v: Shoot[K]) => void }) {
  const [copied, setCopied] = useState(false);

  const portalUrl = shoot.client_token
    ? `${window.location.origin}/client/${shoot.client_token}`
    : null;

  const copyPortalLink = () => {
    if (!portalUrl) return;
    navigator.clipboard.writeText(portalUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <Card title="Client Details">
      {/* Share portal banner */}
      {portalUrl && (
        <div className="mb-4 rounded-lg bg-primary-soft/40 border border-primary/20 px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="text-sm font-medium text-primary">Client portal link</div>
            <div className="text-xs text-muted-foreground mt-0.5 truncate max-w-xs">{portalUrl}</div>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={copyPortalLink}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:opacity-90"
            >
              {copied ? <CheckCheck className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied!" : "Copy link"}
            </button>
            <a
              href={portalUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border bg-background hover:bg-muted text-xs font-medium"
            >
              <Share2 className="h-3.5 w-3.5" /> Preview
            </a>
          </div>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Client name</label>
          <input
            value={shoot.client_name ?? ""}
            onChange={(e) => update("client_name", e.target.value || null)}
            placeholder="e.g. Sarah Johnson"
            className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Client email</label>
          <input
            type="email"
            value={shoot.client_email ?? ""}
            onChange={(e) => update("client_email", e.target.value || null)}
            placeholder="sarah@example.com"
            className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Client phone</label>
          <input
            type="tel"
            value={shoot.client_phone ?? ""}
            onChange={(e) => update("client_phone", e.target.value || null)}
            placeholder="+44 7700 000000"
            className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Final delivery date</label>
          <input
            type="date"
            value={shoot.final_delivery_date ?? ""}
            onChange={(e) => update("final_delivery_date", e.target.value || null)}
            className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Contract status</label>
          <select
            value={shoot.contract_status ?? "unsigned"}
            onChange={(e) => update("contract_status", e.target.value)}
            className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
          >
            <option value="unsigned">Unsigned</option>
            <option value="sent">Sent</option>
            <option value="signed">Signed</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Payment status</label>
          <select
            value={shoot.payment_status ?? "unpaid"}
            onChange={(e) => update("payment_status", e.target.value)}
            className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
          >
            <option value="unpaid">Unpaid</option>
            <option value="deposit_paid">Deposit paid</option>
            <option value="paid">Paid in full</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs text-muted-foreground mb-1">Gallery link</label>
          <input
            type="url"
            value={shoot.gallery_link ?? ""}
            onChange={(e) => update("gallery_link", e.target.value || null)}
            placeholder="https://gallery.example.com/your-shoot"
            className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs text-muted-foreground mb-1">
            Editing progress — {shoot.editing_progress ?? 0}%
          </label>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={shoot.editing_progress ?? 0}
            onChange={(e) => update("editing_progress", Number(e.target.value))}
            className="w-full accent-primary"
          />
          <div className="mt-1.5 h-1.5 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary transition-all" style={{ width: `${shoot.editing_progress ?? 0}%` }} />
          </div>
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs text-muted-foreground mb-1">Notes for client</label>
          <textarea
            value={shoot.client_notes ?? ""}
            onChange={(e) => update("client_notes", e.target.value || null)}
            placeholder="Instructions, links, or info you'll share with your client…"
            rows={3}
            className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm resize-y"
          />
        </div>
      </div>
    </Card>
  );
}

function Card({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-card shadow-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

function Pill({ active, children, onClick, disabled }: any) {
  return (
    <button onClick={onClick} disabled={disabled} className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${active ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted border-border"} ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}>{children}</button>
  );
}

function ShootDetails({ shoot, update }: { shoot: Shoot; update: <K extends keyof Shoot>(k: K, v: Shoot[K]) => void }) {
  // Auto-status by date
  useEffect(() => {
    if (!shoot.date) return;
    const today = new Date(); today.setHours(0,0,0,0);
    const d = new Date(shoot.date); d.setHours(0,0,0,0);
    const auto = d > today ? "upcoming" : d.getTime() === today.getTime() ? "in progress" : "done";
    if (!shoot.status) update("status", auto);
  }, [shoot.date]);

  return (
    <Card title="Shoot Details">
      <div className="grid sm:grid-cols-3 gap-3">
        <div>
          <label className="text-xs text-muted-foreground">Date</label>
          <Popover>
            <PopoverTrigger asChild>
              <button className={cn("mt-1 w-full inline-flex items-center gap-2 px-3 py-2 rounded-md border border-input bg-background text-sm text-left", !shoot.date && "text-muted-foreground")}>
                <CalendarIcon className="h-4 w-4 opacity-70" />
                {shoot.date ? format(new Date(shoot.date + "T00:00:00"), "PPP") : "Pick a date"}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 z-50 bg-popover" align="start">
              <Calendar
                mode="single"
                selected={shoot.date ? new Date(shoot.date + "T00:00:00") : undefined}
                onSelect={(d) => update("date", d ? format(d, "yyyy-MM-dd") : null)}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Time</label>
          <div className="mt-1 flex items-center gap-2">
            <Select
              value={shoot.time ? shoot.time.split(":")[0] : ""}
              onValueChange={(h) => {
                const m = shoot.time ? shoot.time.split(":")[1] : "00";
                update("time", `${h}:${m}`);
              }}
            >
              <SelectTrigger className="w-full">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 opacity-70" />
                  <SelectValue placeholder="Hour" />
                </div>
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {HOUR_OPTIONS.map((h) => (
                  <SelectItem key={h} value={h}>{formatHourLabel(h)} ({h}:00)</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-muted-foreground">:</span>
            <Select
              value={shoot.time ? shoot.time.split(":")[1] : ""}
              onValueChange={(m) => {
                const h = shoot.time ? shoot.time.split(":")[0] : "00";
                update("time", `${h}:${m}`);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Min" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {MINUTE_OPTIONS.map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Location</label>
          <input placeholder="City or place" value={shoot.location ?? ""} onChange={(e) => update("location", e.target.value)} className="mt-1 w-full px-3 py-2 rounded-md border border-input bg-background text-sm" />
        </div>
      </div>
      <div className="mt-4">
        <div className="text-xs text-muted-foreground mb-2">Shoot type</div>
        <div className="flex flex-wrap gap-2">
          {SHOOT_TYPES.map((t) => (
            <Pill key={t} active={shoot.shoot_type === t} onClick={() => update("shoot_type", t)}>{t}</Pill>
          ))}
        </div>
      </div>
      <div className="mt-4">
        <div className="text-xs text-muted-foreground mb-2">Status</div>
        <div className="flex gap-2">
          {["upcoming", "in progress", "done"].map((s) => (
            <Pill key={s} active={shoot.status === s} onClick={() => update("status", s)}>{s}</Pill>
          ))}
        </div>
      </div>
    </Card>
  );
}

async function geocode(q: string): Promise<{ lat: number; lon: number; name: string } | null> {
  try {
    const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=1`);
    const j = await r.json();
    const c = j?.results?.[0];
    return c ? { lat: c.latitude, lon: c.longitude, name: c.name } : null;
  } catch { return null; }
}

function LightTimes({ location, date, shootType }: { location: string; date: string; shootType: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!location || !date) { setData(null); return; }
    let cancel = false;
    setLoading(true);
    (async () => {
      const g = await geocode(location); if (!g || cancel) { setData(null); setLoading(false); return; }
      try {
        const r = await fetch(`https://api.sunrise-sunset.org/json?lat=${g.lat}&lng=${g.lon}&date=${date}&formatted=0`);
        const j = await r.json();
        if (!cancel) setData({ ...j.results, place: g.name });
      } catch {} finally { if (!cancel) setLoading(false); }
    })();
    return () => { cancel = true; };
  }, [location, date]);

  const fmt = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const iso = ["Sports", "Nightclub"].includes(shootType) ? "ISO 1600–3200" : "ISO 400–800";

  return (
    <Card title="Light Times">
      {!location || !date ? (
        <div className="text-sm text-muted-foreground py-6 text-center">Enter a location and date above to see light times.</div>
      ) : loading || !data ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-20 bg-muted animate-pulse rounded-md" />)}</div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { l: "Sunrise", v: data.sunrise, c: "bg-amber-300" },
              { l: "Golden hour AM", v: data.civil_twilight_begin, c: "bg-orange-400" },
              { l: "Solar noon", v: data.solar_noon, c: "bg-yellow-300" },
              { l: "Golden hour PM", v: data.sunset, c: "bg-orange-500" },
              { l: "Sunset", v: data.sunset, c: "bg-rose-400" },
              { l: "Blue hour", v: data.civil_twilight_end, c: "bg-blue-600" },
            ].map((x) => (
              <div key={x.l} className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground">{x.l}</div>
                <div className="font-semibold mt-0.5">{x.v ? fmt(x.v) : "—"}</div>
                <div className={`h-1 mt-2 rounded-full ${x.c}`} />
              </div>
            ))}
          </div>
          <div className="mt-4 text-sm rounded-md bg-primary-soft/40 px-3 py-2 text-foreground">
            Recommended: <strong>{iso}</strong>
          </div>
        </>
      )}
    </Card>
  );
}

function WeatherCard({ location, date }: { location: string; date: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!location || !date) { setData(null); return; }
    let cancel = false; setLoading(true);
    (async () => {
      const g = await geocode(location); if (!g || cancel) { setLoading(false); return; }
      try {
        const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${g.lat}&longitude=${g.lon}&daily=temperature_2m_max,precipitation_probability_max,wind_speed_10m_max,cloud_cover_mean,weather_code&wind_speed_unit=mph&temperature_unit=celsius&start_date=${date}&end_date=${date}`);
        const j = await r.json();
        if (!cancel) setData(j.daily);
      } catch {} finally { if (!cancel) setLoading(false); }
    })();
    return () => { cancel = true; };
  }, [location, date]);

  if (!location || !date) return <Card title="Weather"><div className="text-sm text-muted-foreground py-6 text-center">Enter a location and date above to see the forecast.</div></Card>;
  if (loading || !data) return <Card title="Weather"><div className="h-20 bg-muted animate-pulse rounded-md" /></Card>;

  const rainChance = data.precipitation_probability_max?.[0] ?? 0;
  const desc = weatherCode(data.weather_code?.[0]);

  return (
    <Card title="Weather">
      {rainChance > 50 && (
        <div className="mb-3 rounded-md bg-amber-100 text-amber-900 px-3 py-2 text-sm flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" /> Rain likely — consider weather protection for your gear.
        </div>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Stat l="Temp" v={`${Math.round(data.temperature_2m_max?.[0] ?? 0)}°C`} />
        <Stat l="Conditions" v={desc} />
        <Stat l="Cloud" v={`${Math.round(data.cloud_cover_mean?.[0] ?? 0)}%`} />
        <Stat l="Rain" v={`${rainChance}%`} />
        <Stat l="Wind" v={`${Math.round(data.wind_speed_10m_max?.[0] ?? 0)} mph`} />
      </div>
    </Card>
  );
}

function Stat({ l, v }: { l: string; v: string }) {
  return <div className="rounded-md border p-3"><div className="text-xs text-muted-foreground">{l}</div><div className="font-semibold mt-0.5">{v}</div></div>;
}

function weatherCode(c?: number) {
  if (c == null) return "—";
  if (c === 0) return "Clear";
  if (c < 3) return "Partly cloudy";
  if (c < 50) return "Overcast";
  if (c < 70) return "Rain";
  if (c < 80) return "Snow";
  return "Storm";
}

function MoodTags({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const toggle = (m: string) => onChange(value.includes(m) ? value.filter((x) => x !== m) : [...value, m]);
  return (
    <Card title="Mood Tags">
      <div className="flex flex-wrap gap-2">{MOODS.map((m) => <Pill key={m} active={value.includes(m)} onClick={() => toggle(m)}>{m}</Pill>)}</div>
    </Card>
  );
}

function ShotList({ value, onChange }: { value: Shot[]; onChange: (v: Shot[]) => void }) {
  const p = progressOf(value);
  const addShot = () => onChange([...value, { id: newId(), text: "", tag: "Custom", done: false }]);
  const update = (id: string, patch: Partial<Shot>) => onChange(value.map((s) => s.id === id ? { ...s, ...patch } : s));
  const remove = (id: string) => onChange(value.filter((s) => s.id !== id));

  return (
    <Card title="Shot List" action={<button onClick={addShot} className="text-sm text-primary inline-flex items-center gap-1 hover:underline"><Plus className="h-3.5 w-3.5" /> Add shot</button>}>
      {value.length === 0 ? (
        <div className="text-sm text-muted-foreground py-4 text-center">No shots yet. Click "Add shot" to begin.</div>
      ) : (
        <ul className="space-y-2">
          {value.map((s) => (
            <li key={s.id} className="flex items-center gap-2">
              <button onClick={() => update(s.id, { done: !s.done })} className={`h-5 w-5 shrink-0 rounded border flex items-center justify-center ${s.done ? "bg-primary border-primary text-primary-foreground" : "bg-background"}`}>
                {s.done && <Check className="h-3.5 w-3.5" />}
              </button>
              <input
                autoFocus={!s.text}
                value={s.text}
                onChange={(e) => update(s.id, { text: e.target.value })}
                placeholder="Describe the shot…"
                className={`flex-1 px-2 py-1.5 rounded-md border border-transparent bg-transparent text-sm focus:border-input focus:bg-background focus:outline-none ${s.done ? "line-through opacity-50" : ""}`}
              />
              <select value={s.tag} onChange={(e) => update(s.id, { tag: e.target.value })} className="text-xs px-2 py-1 rounded border bg-background">
                {SHOT_TAGS.map((t) => <option key={t}>{t}</option>)}
              </select>
              <button onClick={() => remove(s.id)} className="p-1 text-muted-foreground hover:text-destructive"><X className="h-4 w-4" /></button>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-4">
        <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
          <span>{p.done} of {p.total} shots captured</span><span>{p.pct}%</span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden"><div className="h-full bg-primary transition-all" style={{ width: `${p.pct}%` }} /></div>
      </div>
    </Card>
  );
}

function GearChecklist({ value, onChange, isPro }: { value: string[]; onChange: (v: string[]) => void; isPro: boolean }) {
  const [custom, setCustom] = useState("");
  const toggle = (g: string) => onChange(value.includes(g) ? value.filter((x) => x !== g) : [...value, g]);
  const addCustom = () => { if (!custom.trim()) return; onChange([...value, custom.trim()]); setCustom(""); };
  return (
    <Card title={`Gear Checklist${!isPro ? "" : ""}`}>
      <div className="flex flex-wrap gap-2 mb-3">
        {GEAR.map((g) => <Pill key={g} active={value.includes(g)} onClick={() => toggle(g)}>{g}</Pill>)}
        {value.filter((v) => !GEAR.includes(v)).map((g) => (
          <span key={g} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-sm">
            {g}<button onClick={() => toggle(g)} className="opacity-80 hover:opacity-100"><X className="h-3 w-3" /></button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Add custom gear…" className="flex-1 px-3 py-2 rounded-md border border-input bg-background text-sm" onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustom())} />
        <button onClick={addCustom} className="px-3 py-2 rounded-md border bg-background hover:bg-muted text-sm">Add</button>
      </div>
    </Card>
  );
}

function NotesCard({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Card title="Notes">
      <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder="Anything else — parking, permissions, contacts, reminders…" rows={5} className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm resize-y" />
    </Card>
  );
}

function TemplateModal({ onClose, onPick, hasData, isPro }: { onClose: () => void; onPick: (n: string) => void; hasData: boolean; isPro: boolean }) {
  const pick = (name: string) => {
    if (!isPro) { toast.error("Templates are a Pro feature. Upgrade to unlock all 5 templates."); return; }
    if (hasData && !confirm("This will replace your current mood tags and shot list. Continue?")) return;
    onPick(name);
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-card rounded-lg border shadow-lg max-w-2xl w-full max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h3 className="font-semibold">Choose a template</h3>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded"><X className="h-5 w-5" /></button>
        </div>
        <div className="grid sm:grid-cols-2 gap-3 p-5">
          {Object.entries(TEMPLATES).map(([name, t]) => (
            <button key={name} onClick={() => pick(name)} className="text-left rounded-md border p-4 hover:border-primary hover:bg-primary-soft/30 transition-colors relative">
              {!isPro && <Lock className="absolute top-3 right-3 h-3.5 w-3.5 text-muted-foreground" />}
              <div className="font-semibold">{name}</div>
              <div className="text-xs text-muted-foreground mt-1">{t.moods.join(" · ")}</div>
              <div className="text-xs text-muted-foreground mt-2 line-clamp-2">{t.shots.slice(0,3).join(", ")}…</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
