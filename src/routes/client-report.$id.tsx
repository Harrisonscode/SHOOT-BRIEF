import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { progressOf, TYPE_COLORS, type Shot } from "@/lib/shoot";
import { format } from "date-fns";
import { Printer, Download, ArrowLeft, Check, Lock } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { generateClientReportPdf } from "@/lib/pdf";
import { toast } from "sonner";

export const Route = createFileRoute("/client-report/$id")({
  head: () => ({ meta: [{ title: "Client Report — Shoot Brief" }] }),
  component: ClientReportPage,
});

type DeliveredPhoto = {
  path: string;
  name: string;
  signedUrl?: string;
};

type ShootData = {
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
  client_name: string | null;
  client_email: string | null;
  photographer_website: string | null;
  delivered_photos: DeliveredPhoto[] | null;
};

function fmtDate(d: string | null) {
  if (!d) return null;
  try { return format(new Date(d + "T00:00:00"), "EEEE d MMMM yyyy"); } catch { return d; }
}

function fmtTime(t: string | null) {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return t;
  const period = h >= 12 ? "PM" : "AM";
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display}:${String(m).padStart(2, "0")} ${period}`;
}

function ClientReportPage() {
  const { id } = Route.useParams();
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [shoot, setShoot] = useState<ShootData | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [photos, setPhotos] = useState<DeliveredPhoto[]>([]);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate({ to: "/login", search: { tab: "signin", redirect: `/client-report/${id}` } as any, replace: true }); return; }
    (async () => {
      const { data, error } = await supabase.from("shoots").select("*").eq("id", id).maybeSingle();
      if (error || !data) { setNotFound(true); return; }
      const s = data as any as ShootData;
      setShoot(s);
      // Resolve signed URLs for delivered photos
      const raw: DeliveredPhoto[] = (s.delivered_photos as any) ?? [];
      const resolved = await Promise.all(raw.map(async (p) => {
        const { data: sig } = await supabase.storage.from("delivered-photos").createSignedUrl(p.path, 3600 * 24);
        return { ...p, signedUrl: sig?.signedUrl ?? "" };
      }));
      setPhotos(resolved);
    })();
  }, [id, user, loading]);

  if (loading || (!shoot && !notFound)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold">Report not found</h2>
          <Link to="/dashboard" className="mt-4 inline-block text-primary hover:underline">← Dashboard</Link>
        </div>
      </div>
    );
  }

  if (!profile?.is_pro) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
        <div className="max-w-md text-center rounded-xl border bg-card shadow-card p-10">
          <Lock className="h-10 w-10 mx-auto text-muted-foreground" />
          <h2 className="mt-4 text-xl font-semibold">Pro feature</h2>
          <p className="text-muted-foreground mt-2 text-sm">Client reports are available on the Pro plan.</p>
          <Link to="/billing" className="mt-5 inline-flex px-5 py-2.5 rounded-md bg-primary text-primary-foreground font-medium hover:opacity-90">
            Upgrade to Pro
          </Link>
        </div>
      </div>
    );
  }

  const s = shoot!;
  const progress = progressOf(s.shot_list ?? []);
  const typeColor = TYPE_COLORS[s.shoot_type ?? "Custom"] ?? TYPE_COLORS.Custom;

  const handlePrint = () => window.print();

  const handleDownloadPdf = () => {
    generateClientReportPdf(
      {
        name: s.name,
        date: s.date,
        time: s.time,
        location: s.location,
        shoot_type: s.shoot_type,
        status: s.status,
        mood_tags: s.mood_tags,
        shot_list: s.shot_list,
        notes: s.notes,
        client_name: s.client_name,
        delivered_photos_count: photos.length,
      },
      {
        name: profile?.display_name ?? "",
        email: profile?.email ?? user?.email ?? "",
        website: s.photographer_website ?? "",
      }
    );
  };

  return (
    <>
      {/* Toolbar — hidden on print */}
      <div className="print:hidden sticky top-0 z-40 bg-background border-b px-4 sm:px-8 py-3 flex items-center justify-between gap-3">
        <Link to="/planner/$id" params={{ id }} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to planner
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadPdf}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border bg-background hover:bg-muted text-sm"
          >
            <Download className="h-4 w-4" /> Download PDF
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-md bg-primary text-primary-foreground hover:opacity-90 text-sm font-medium"
          >
            <Printer className="h-4 w-4" /> Print / Save as PDF
          </button>
        </div>
      </div>

      {/* Report body */}
      <div ref={printRef} className="min-h-screen bg-white text-[#1a1a1a] print:bg-white">
        {/* Cover / Header */}
        <div className="bg-[#1a1a1a] text-white px-10 py-14 print:px-12 print:py-16">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-start justify-between gap-6 flex-wrap">
              <div>
                <div className="text-xs uppercase tracking-widest text-white/50 mb-3 font-medium">Client Delivery Report</div>
                <h1 className="text-4xl font-bold leading-tight tracking-tight">{s.name || "Untitled Shoot"}</h1>
                {s.client_name && (
                  <div className="mt-2 text-white/60 text-lg">for {s.client_name}</div>
                )}
              </div>
              {(profile?.display_name || profile?.email) && (
                <div className="text-right text-sm text-white/60 mt-1">
                  <div className="text-white font-semibold text-base">{profile.display_name}</div>
                  <div>{profile.email}</div>
                  {s.photographer_website && <div>{s.photographer_website}</div>}
                </div>
              )}
            </div>

            {/* Key info strip */}
            <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-5 border-t border-white/10 pt-8">
              {[
                { label: "Date", value: fmtDate(s.date) },
                { label: "Time", value: fmtTime(s.time) },
                { label: "Location", value: s.location },
                { label: "Type", value: s.shoot_type },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div className="text-[10px] uppercase tracking-widest text-white/40 mb-1">{label}</div>
                  <div className="text-white font-medium">{value ?? "—"}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-6 sm:px-10 py-12 space-y-12 print:px-12">

          {/* Shot progress summary */}
          {(s.shot_list?.length ?? 0) > 0 && (
            <section>
              <SectionHeading>Shoot Summary</SectionHeading>
              <div className="grid grid-cols-3 gap-4 mt-4">
                <StatBox label="Total shots planned" value={String(progress.total)} />
                <StatBox label="Shots captured" value={String(progress.done)} accent />
                <StatBox label="Completion" value={`${progress.pct}%`} />
              </div>
              {/* Progress bar */}
              <div className="mt-4 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-[#4f8a1f] transition-all rounded-full" style={{ width: `${progress.pct}%` }} />
              </div>
            </section>
          )}

          {/* Delivered photos */}
          {photos.length > 0 && (
            <section>
              <SectionHeading>{photos.length} Photo{photos.length !== 1 ? "s" : ""} Delivered</SectionHeading>
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3 print:grid-cols-4">
                {photos.map((p, i) => (
                  <button
                    key={p.path}
                    onClick={() => setLightbox(p.signedUrl ?? null)}
                    className="print:cursor-default group relative aspect-square overflow-hidden rounded-lg bg-gray-100 border border-gray-200 hover:ring-2 ring-[#4f8a1f] transition-all"
                  >
                    {p.signedUrl && (
                      <img
                        src={p.signedUrl}
                        alt={p.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    )}
                    <div className="absolute bottom-0 inset-x-0 bg-black/40 text-white text-[10px] px-2 py-1 truncate opacity-0 group-hover:opacity-100 transition-opacity print:hidden">
                      {p.name}
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Shot list */}
          {(s.shot_list?.length ?? 0) > 0 && (
            <section>
              <SectionHeading>Shot List</SectionHeading>
              <div className="mt-4 space-y-2">
                {s.shot_list!.map((shot) => (
                  <div key={shot.id} className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${shot.done ? "bg-[#f0f7e8] border-[#c8e0a0]" : "bg-gray-50 border-gray-200"}`}>
                    <div className={`shrink-0 h-5 w-5 rounded border-2 flex items-center justify-center ${shot.done ? "bg-[#4f8a1f] border-[#4f8a1f]" : "border-gray-300 bg-white"}`}>
                      {shot.done && <Check className="h-3 w-3 text-white" />}
                    </div>
                    <span className={`flex-1 text-sm font-medium ${shot.done ? "text-[#2d5a0e]" : "text-gray-600"}`}>
                      {shot.text || "—"}
                    </span>
                    {shot.tag && shot.tag !== "Custom" && (
                      <span className="text-[11px] px-2 py-0.5 rounded border border-gray-300 text-gray-500 bg-white">{shot.tag}</span>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Mood & style */}
          {(s.mood_tags?.length ?? 0) > 0 && (
            <section>
              <SectionHeading>Mood & Style</SectionHeading>
              <div className="mt-4 flex flex-wrap gap-2">
                {s.mood_tags!.map((tag) => (
                  <span key={tag} className="px-3 py-1.5 rounded-full text-sm bg-[#f0f7e8] text-[#2d5a0e] border border-[#c8e0a0] font-medium">
                    {tag}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Notes */}
          {s.notes?.trim() && (
            <section>
              <SectionHeading>Notes</SectionHeading>
              <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 px-5 py-4 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                {s.notes}
              </div>
            </section>
          )}

          {/* Footer */}
          <div className="pt-6 border-t border-gray-200 flex items-center justify-between text-xs text-gray-400">
            <span>Prepared with Shoot Brief</span>
            <span>{fmtDate(new Date().toISOString().slice(0, 10))}</span>
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="print:hidden fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <img
            src={lightbox}
            alt=""
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 text-white/70 hover:text-white text-2xl font-light"
          >
            ✕
          </button>
        </div>
      )}

      {/* Print styles */}
      <style>{`
        @media print {
          @page { margin: 0; size: A4; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
    </>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400">{children}</h2>
      <div className="flex-1 h-px bg-gray-100" />
    </div>
  );
}

function StatBox({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 text-center ${accent ? "bg-[#f0f7e8] border-[#c8e0a0]" : "bg-gray-50 border-gray-200"}`}>
      <div className={`text-2xl font-bold ${accent ? "text-[#2d5a0e]" : "text-[#1a1a1a]"}`}>{value}</div>
      <div className="text-xs text-gray-500 mt-1">{label}</div>
    </div>
  );
}
