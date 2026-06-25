import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { format } from "date-fns";
import { Check, X, Clock, Copy, CheckCheck, ExternalLink, Settings2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/bookings")({
  head: () => ({ meta: [{ title: "Bookings — Shoot Brief" }] }),
  component: () => <AppShell title="Bookings"><BookingsPage /></AppShell>,
});

type BookingRequest = {
  id: string;
  client_name: string;
  client_email: string;
  client_phone: string | null;
  shoot_type: string | null;
  preferred_date: string | null;
  budget: string | null;
  location: string | null;
  message: string | null;
  status: "pending" | "accepted" | "declined";
  created_at: string;
};

function BookingsPage() {
  const { user, profile } = useAuth();
  const [requests, setRequests] = useState<BookingRequest[] | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "accepted" | "declined">("all");
  const [selected, setSelected] = useState<BookingRequest | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [copied, setCopied] = useState(false);

  // Booking settings
  const [slug, setSlug] = useState(profile?.booking_slug ?? "");
  const [intro, setIntro] = useState(profile?.booking_intro ?? "");
  const [active, setActive] = useState(profile?.booking_active ?? true);
  const [savingSettings, setSavingSettings] = useState(false);

  const bookingUrl = slug ? `${window.location.origin}/book/${slug}` : null;

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("booking_requests")
      .select("*")
      .eq("photographer_id", user.id)
      .order("created_at", { ascending: false });
    setRequests((data as any) ?? []);
  };

  useEffect(() => { load(); }, [user]);

  useEffect(() => {
    if (profile) {
      setSlug(profile.booking_slug ?? "");
      setIntro(profile.booking_intro ?? "");
      setActive(profile.booking_active ?? true);
    }
  }, [profile]);

  const updateStatus = async (id: string, status: "accepted" | "declined") => {
    await supabase.from("booking_requests").update({ status } as any).eq("id", id);
    setRequests((prev) => prev?.map((r) => r.id === id ? { ...r, status } : r) ?? null);
    if (selected?.id === id) setSelected((s) => s ? { ...s, status } : null);
    toast.success(status === "accepted" ? "Request accepted" : "Request declined");
  };

  const copyLink = () => {
    if (!bookingUrl) return;
    navigator.clipboard.writeText(bookingUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const saveSettings = async () => {
    if (!user) return;
    if (!slug.trim()) { toast.error("Please set a booking URL"); return; }
    const cleanSlug = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");
    setSavingSettings(true);
    const { error } = await supabase
      .from("profiles")
      .update({ booking_slug: cleanSlug, booking_intro: intro.trim() || null, booking_active: active } as any)
      .eq("id", user.id);
    setSavingSettings(false);
    if (error) { toast.error(error.message); return; }
    setSlug(cleanSlug);
    toast.success("Booking page saved");
    setShowSettings(false);
  };

  const filtered = requests?.filter((r) => filter === "all" ? true : r.status === filter);

  const pendingCount = requests?.filter((r) => r.status === "pending").length ?? 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Booking Requests</h1>
          {pendingCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold">
              {pendingCount} new
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {bookingUrl && (
            <>
              <button onClick={copyLink} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border bg-background hover:bg-muted text-sm">
                {copied ? <CheckCheck className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied!" : "Copy booking link"}
              </button>
              <a href={bookingUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border bg-background hover:bg-muted text-sm">
                <ExternalLink className="h-4 w-4" /> Preview
              </a>
            </>
          )}
          <button onClick={() => setShowSettings(true)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
            <Settings2 className="h-4 w-4" /> {bookingUrl ? "Settings" : "Set up booking page"}
          </button>
        </div>
      </div>

      {/* Setup prompt if no slug yet */}
      {!bookingUrl && (
        <div className="rounded-lg border bg-card shadow-card p-8 text-center mb-6">
          <div className="text-4xl mb-3">📋</div>
          <h3 className="font-semibold text-lg">Set up your booking page</h3>
          <p className="text-muted-foreground text-sm mt-1 max-w-sm mx-auto">
            Create a public link clients can use to send you booking requests. No account needed on their end.
          </p>
          <button onClick={() => setShowSettings(true)} className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
            Get started
          </button>
        </div>
      )}

      {/* Filter tabs */}
      {requests && requests.length > 0 && (
        <div className="flex gap-1 mb-4 border-b">
          {(["all", "pending", "accepted", "declined"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 text-sm font-medium capitalize border-b-2 -mb-px transition-colors ${
                filter === f ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {f} {f === "pending" && pendingCount > 0 && `(${pendingCount})`}
            </button>
          ))}
        </div>
      )}

      {requests === null ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />)}
        </div>
      ) : filtered?.length === 0 ? (
        <div className="rounded-lg border bg-card shadow-card py-14 text-center">
          <p className="text-muted-foreground text-sm">No {filter !== "all" ? filter : ""} requests yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered!.map((r) => (
            <button
              key={r.id}
              onClick={() => setSelected(r)}
              className={`w-full text-left rounded-lg border bg-card shadow-card p-4 hover:border-primary/40 transition-colors ${
                selected?.id === r.id ? "border-primary/40 ring-1 ring-primary/20" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">{r.client_name}</span>
                    {r.shoot_type && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{r.shoot_type}</span>
                    )}
                    <StatusBadge status={r.status} />
                  </div>
                  <div className="text-sm text-muted-foreground mt-0.5 truncate">
                    {r.client_email}
                    {r.preferred_date && ` · ${format(new Date(r.preferred_date + "T00:00:00"), "d MMM yyyy")}`}
                    {r.location && ` · ${r.location}`}
                  </div>
                  {r.message && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{r.message}</p>
                  )}
                </div>
                <div className="text-xs text-muted-foreground shrink-0">
                  {format(new Date(r.created_at), "d MMM")}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Detail panel */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setSelected(null)}>
          <div className="bg-card rounded-xl border shadow-xl max-w-lg w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold">{selected.client_name}</h2>
                <StatusBadge status={selected.status} />
              </div>
              <button onClick={() => setSelected(null)} className="p-1.5 rounded hover:bg-muted">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              {[
                ["Email", selected.client_email],
                ["Phone", selected.client_phone],
                ["Shoot type", selected.shoot_type],
                ["Preferred date", selected.preferred_date ? format(new Date(selected.preferred_date + "T00:00:00"), "EEEE d MMMM yyyy") : null],
                ["Location", selected.location],
                ["Budget", selected.budget],
              ].map(([label, value]) => value ? (
                <div key={label as string} className="flex gap-3">
                  <span className="text-muted-foreground w-28 shrink-0">{label}</span>
                  <span className="font-medium">{value}</span>
                </div>
              ) : null)}
              {selected.message && (
                <div>
                  <div className="text-muted-foreground mb-1">Message</div>
                  <div className="bg-muted rounded-lg px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap">{selected.message}</div>
                </div>
              )}
            </div>

            {selected.status === "pending" && (
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => updateStatus(selected.id, "accepted")}
                  className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:opacity-90"
                >
                  <Check className="h-4 w-4" /> Accept
                </button>
                <button
                  onClick={() => updateStatus(selected.id, "declined")}
                  className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-lg border bg-background hover:bg-muted font-medium text-sm text-destructive border-destructive/30"
                >
                  <X className="h-4 w-4" /> Decline
                </button>
              </div>
            )}

            {selected.status === "accepted" && (
              <div className="mt-6">
                <p className="text-sm text-muted-foreground mb-3">Ready to create a shoot from this request?</p>
                <Link
                  to="/planner"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
                  onClick={() => setSelected(null)}
                >
                  Create shoot →
                </Link>
              </div>
            )}

            <div className="mt-4 text-xs text-muted-foreground">
              Received {format(new Date(selected.created_at), "EEEE d MMMM yyyy 'at' HH:mm")}
            </div>
          </div>
        </div>
      )}

      {/* Settings modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowSettings(false)}>
          <div className="bg-card rounded-xl border shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold">Booking page settings</h2>
              <button onClick={() => setShowSettings(false)} className="p-1.5 rounded hover:bg-muted">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                  Your booking URL
                </label>
                <div className="flex items-center gap-0 rounded-lg border overflow-hidden">
                  <span className="px-3 py-2.5 bg-muted text-muted-foreground text-sm border-r whitespace-nowrap">
                    {window.location.origin}/book/
                  </span>
                  <input
                    value={slug}
                    onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
                    placeholder="your-name"
                    className="flex-1 px-3 py-2.5 text-sm bg-background focus:outline-none"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">Only lowercase letters, numbers and hyphens</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                  Intro message (optional)
                </label>
                <textarea
                  value={intro}
                  onChange={(e) => setIntro(e.target.value)}
                  placeholder="Tell potential clients a bit about your work and what to expect..."
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-lg border bg-background text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex items-center justify-between py-2">
                <div>
                  <div className="text-sm font-medium">Accept bookings</div>
                  <div className="text-xs text-muted-foreground">Turn off to pause new requests</div>
                </div>
                <button
                  onClick={() => setActive(!active)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${active ? "bg-primary" : "bg-muted"}`}
                >
                  <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${active ? "translate-x-6" : "translate-x-1"}`} />
                </button>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button onClick={() => setShowSettings(false)} className="flex-1 py-2.5 rounded-lg border bg-background hover:bg-muted text-sm font-medium">
                Cancel
              </button>
              <button onClick={saveSettings} disabled={savingSettings || !slug.trim()} className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-60">
                {savingSettings ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-amber-100 text-amber-700",
    accepted: "bg-green-100 text-green-700",
    declined: "bg-red-100 text-red-600",
  };
  const icons: Record<string, React.ReactNode> = {
    pending: <Clock className="h-3 w-3" />,
    accepted: <Check className="h-3 w-3" />,
    declined: <X className="h-3 w-3" />,
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] ?? ""}`}>
      {icons[status]} {status}
    </span>
  );
}
