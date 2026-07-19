import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, Loader2, Shield, FileText, Clock, Monitor } from "lucide-react";
import { buildBrand, BrandStyle, BrandLogo } from "@/lib/brand";
import { format } from "date-fns";

export const Route = createFileRoute("/sign/$token")({
  component: SignPage,
});

async function logEvent(contract_id: string, client_token: string, event_type: string, metadata?: any) {
  await fetch("/api/public/contract-event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contract_id, client_token, event_type, metadata }),
  }).catch(() => {});
}

function SignaturePad({ onSave, color }: { onSave: (dataUrl: string) => void; color: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  const getPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ("touches" in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    return {
      x: ((e as React.MouseEvent).clientX - rect.left) * scaleX,
      y: ((e as React.MouseEvent).clientY - rect.top) * scaleY,
    };
  };

  const start = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    drawing.current = true;
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!drawing.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#1a1a1a";
    const pos = getPos(e, canvas);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    setHasDrawn(true);
  };

  const end = () => {
    drawing.current = false;
    if (hasDrawn && canvasRef.current) {
      onSave(canvasRef.current.toDataURL());
    }
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    onSave("");
  };

  return (
    <div>
      <div className="relative rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 overflow-hidden" style={{ touchAction: "none" }}>
        <canvas
          ref={canvasRef}
          width={600}
          height={160}
          className="w-full h-32 cursor-crosshair"
          onMouseDown={start}
          onMouseMove={draw}
          onMouseUp={end}
          onMouseLeave={end}
          onTouchStart={start}
          onTouchMove={draw}
          onTouchEnd={end}
        />
        {!hasDrawn && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-gray-300 text-sm select-none">Draw your signature here</span>
          </div>
        )}
      </div>
      {hasDrawn && (
        <button onClick={clear} className="mt-2 text-xs text-gray-400 hover:text-gray-600 underline">
          Clear and redraw
        </button>
      )}
    </div>
  );
}

function AuditTrail({ events }: { events: any[] }) {
  const iconFor = (type: string) => {
    if (type === "signed") return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (type === "viewed") return <FileText className="h-4 w-4 text-blue-400" />;
    if (type === "sent") return <Monitor className="h-4 w-4 text-gray-400" />;
    return <Clock className="h-4 w-4 text-gray-400" />;
  };

  const labelFor = (type: string) => ({
    created: "Contract created",
    sent: "Sent to client",
    viewed: "Contract opened by client",
    signed: "Contract signed",
  }[type] ?? type);

  return (
    <div className="rounded-xl border bg-white shadow-sm p-6">
      <div className="flex items-center gap-2 mb-4">
        <Shield className="h-5 w-5 text-green-500" />
        <h3 className="font-semibold text-gray-900">Audit certificate</h3>
      </div>
      <div className="space-y-3">
        {events.map((e, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="mt-0.5 shrink-0">{iconFor(e.event_type)}</div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-800">{labelFor(e.event_type)}</div>
              <div className="text-xs text-gray-400 mt-0.5">
                {format(new Date(e.occurred_at), "d MMM yyyy 'at' HH:mm:ss 'UTC'")}
                {e.ip_address && e.ip_address !== "unknown" && ` · IP: ${e.ip_address}`}
              </div>
              {e.metadata?.signed_name && (
                <div className="text-xs text-gray-500 mt-0.5">Signed by: {e.metadata.signed_name}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SignPage() {
  const { token } = Route.useParams();
  const [contract, setContract] = useState<any | null>(null);
  const [photographer, setPhotographer] = useState<any | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [name, setName] = useState("");
  const [signatureDataUrl, setSignatureDataUrl] = useState("");
  const [signatureMode, setSignatureMode] = useState<"type" | "draw">("type");
  const [checkedRead, setCheckedRead] = useState(false);
  const [checkedAgree, setCheckedAgree] = useState(false);
  const [signing, setSigning] = useState(false);
  const [signed, setSigned] = useState(false);
  const viewedLogged = useRef(false);

  useEffect(() => {
    (supabase.from("contracts") as any)
      .select("*, shoots(name, client_name, date, location), profiles!contracts_user_id_fkey(display_name, business_name, email, phone, website, brand_color, logo_url, font_family, is_pro)")
      .eq("client_token", token)
      .maybeSingle()
      .then(async ({ data }: any) => {
        if (!data) { setNotFound(true); return; }
        setContract(data);
        const prof = data.profiles;
        setPhotographer(prof);
        if (prof?.logo_url && !prof.logo_url.startsWith("http")) {
          const { data: signed } = await supabase.storage.from("logos").createSignedUrl(prof.logo_url, 3600);
          if (signed?.signedUrl) setPhotographer((p: any) => ({ ...p, _resolvedLogoUrl: signed.signedUrl }));
        }
        if (data.status === "signed") {
          setSigned(true);
          // Load audit events for certificate
          const { data: evts } = await (supabase.from("contract_events") as any)
            .select("*").eq("contract_id", data.id).order("occurred_at", { ascending: true });
          setEvents(evts ?? []);
        }
        if (data.shoots?.client_name) setName(data.shoots.client_name);

        // Log "viewed" event once
        if (!viewedLogged.current && data.status !== "signed") {
          viewedLogged.current = true;
          await logEvent(data.id, token, "viewed");
        }
      });
  }, [token]);

  const sign = async () => {
    if (!name.trim()) { alert("Please enter your full name"); return; }
    if (signatureMode === "draw" && !signatureDataUrl) { alert("Please draw your signature"); return; }
    if (!checkedRead || !checkedAgree) { alert("Please confirm you have read and agree to the contract"); return; }

    setSigning(true);

    // Log signing event server-side (captures real IP)
    await logEvent(contract.id, token, "signed", { signed_name: name.trim() });

    // Also update contract directly as fallback
    await (supabase.from("contracts") as any).update({
      status: "signed",
      signed_at: new Date().toISOString(),
      signed_name: name.trim(),
    }).eq("id", contract.id);

    // Load audit trail for certificate
    const { data: evts } = await (supabase.from("contract_events") as any)
      .select("*").eq("contract_id", contract.id).order("occurred_at", { ascending: true });
    setEvents(evts ?? []);

    setSigning(false);
    setSigned(true);
  };

  const brand = buildBrand(photographer, (photographer as any)?._resolvedLogoUrl ?? null);
  const canSign = name.trim() &&
    (signatureMode === "type" || signatureDataUrl) &&
    checkedRead && checkedAgree;

  if (notFound) return (
    <div className="min-h-screen bg-[#f8faf7] flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <div className="text-4xl mb-4">📄</div>
        <h1 className="text-xl font-bold text-gray-900">Contract not found</h1>
        <p className="text-gray-500 mt-2 text-sm">This link may have expired or been removed.</p>
      </div>
    </div>
  );

  if (!contract) return (
    <div className="min-h-screen bg-[#f8faf7] flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8faf7]" style={{ fontFamily: brand.fontFamily }}>
      <BrandStyle brand={brand} />

      {/* Top bar */}
      <div
        className="fixed top-0 inset-x-0 z-50 bg-white border-b border-gray-100 flex items-center gap-3 px-4"
        style={{ paddingTop: "env(safe-area-inset-top, 0px)", paddingBottom: "12px", height: "calc(52px + env(safe-area-inset-top, 0px))" }}
      >
        <BrandLogo brand={brand} className="h-6 w-auto max-w-[120px]" />
        <div className="ml-auto flex items-center gap-1.5 text-xs text-gray-400">
          <Shield className="h-3.5 w-3.5 text-green-500" />
          Legally binding e-signature
        </div>
      </div>

      <div style={{ paddingTop: "calc(52px + env(safe-area-inset-top, 0px))" }}>
        <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">

          {signed ? (
            <div className="space-y-6">
              <div className="text-center py-8">
                <CheckCircle className="h-16 w-16 mx-auto mb-4 text-green-500" />
                <h1 className="text-2xl font-bold text-gray-900">Contract signed!</h1>
                <p className="text-gray-500 mt-2 text-sm">
                  A legally binding record has been created. {photographer?.business_name || photographer?.display_name} has been notified.
                </p>
                {photographer?.email && (
                  <p className="text-sm text-gray-400 mt-3">
                    Questions? <a href={`mailto:${photographer.email}`} className="underline" style={{ color: brand.color }}>{photographer.email}</a>
                  </p>
                )}
              </div>
              {events.length > 0 && <AuditTrail events={events} />}
            </div>
          ) : (
            <>
              {/* Header */}
              <div>
                <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
                  <Shield className="h-3.5 w-3.5 text-green-500" />
                  Secure document · Powered by Shoot Brief
                </div>
                <h1 className="text-2xl font-bold text-gray-900">{contract.title}</h1>
                {contract.shoots && (
                  <p className="text-gray-500 mt-1 text-sm">
                    {contract.shoots.name}
                    {contract.shoots.client_name ? ` · ${contract.shoots.client_name}` : ""}
                    {contract.shoots.date ? ` · ${format(new Date(contract.shoots.date + "T00:00:00"), "d MMMM yyyy")}` : ""}
                  </p>
                )}
                <p className="text-sm mt-2 font-medium" style={{ color: brand.color }}>
                  {photographer?.business_name || photographer?.display_name}
                </p>
              </div>

              {/* Contract body */}
              <div className="rounded-xl border bg-white p-6 sm:p-8 shadow-sm">
                <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed whitespace-pre-wrap text-sm">
                  {contract.body}
                </div>
              </div>

              {/* Signature section */}
              <div className="rounded-xl border bg-white p-6 shadow-sm space-y-5">
                <div>
                  <h3 className="font-semibold text-gray-900">Sign this contract</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    By signing below you confirm you have read and agree to the above terms. Your electronic signature is legally binding under the Electronic Communications Act 2000 (UK) and equivalent legislation.
                  </p>
                </div>

                {/* Full name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Full legal name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Type your full legal name"
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-gray-900 text-sm"
                  />
                </div>

                {/* Signature mode toggle */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Signature</label>
                  <div className="flex gap-2 mb-3">
                    <button
                      onClick={() => setSignatureMode("type")}
                      className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${signatureMode === "type" ? "text-white border-transparent" : "bg-white border-gray-200 text-gray-600"}`}
                      style={signatureMode === "type" ? { backgroundColor: brand.color } : {}}
                    >
                      Type
                    </button>
                    <button
                      onClick={() => setSignatureMode("draw")}
                      className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${signatureMode === "draw" ? "text-white border-transparent" : "bg-white border-gray-200 text-gray-600"}`}
                      style={signatureMode === "draw" ? { backgroundColor: brand.color } : {}}
                    >
                      Draw
                    </button>
                  </div>

                  {signatureMode === "type" ? (
                    name.trim() ? (
                      <div className="p-4 rounded-lg border bg-gray-50">
                        <div className="text-xs text-gray-400 mb-1">Signature preview</div>
                        <div className="text-3xl text-gray-700" style={{ fontFamily: "Georgia, serif", fontStyle: "italic" }}>
                          {name}
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 rounded-lg border border-dashed border-gray-200 bg-gray-50 text-center text-sm text-gray-300">
                        Your typed signature will appear here
                      </div>
                    )
                  ) : (
                    <SignaturePad onSave={setSignatureDataUrl} color={brand.color} />
                  )}
                </div>

                {/* Confirmation checkboxes */}
                <div className="space-y-3">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checkedRead}
                      onChange={(e) => setCheckedRead(e.target.checked)}
                      className="mt-0.5 h-4 w-4 shrink-0 accent-current"
                      style={{ accentColor: brand.color }}
                    />
                    <span className="text-sm text-gray-600">
                      I confirm I have read and understood the full contract above
                    </span>
                  </label>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checkedAgree}
                      onChange={(e) => setCheckedAgree(e.target.checked)}
                      className="mt-0.5 h-4 w-4 shrink-0"
                      style={{ accentColor: brand.color }}
                    />
                    <span className="text-sm text-gray-600">
                      I agree to be legally bound by these terms. I understand this electronic signature has the same legal effect as a handwritten signature.
                    </span>
                  </label>
                </div>

                {/* Sign button */}
                <button
                  onClick={sign}
                  disabled={!canSign || signing}
                  className="w-full py-3.5 rounded-xl text-white font-semibold text-sm hover:opacity-90 disabled:opacity-40 transition-opacity flex items-center justify-center gap-2"
                  style={{ backgroundColor: brand.color }}
                >
                  {signing ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Creating signed record…</>
                  ) : (
                    <><Shield className="h-4 w-4" /> Sign contract</>
                  )}
                </button>

                <p className="text-xs text-gray-400 text-center leading-relaxed">
                  Your IP address, timestamp, and device information will be recorded as part of the legally binding audit trail.
                </p>
              </div>
            </>
          )}

          <div className="text-center text-xs text-gray-300 pb-6">
            Powered by <span className="font-medium">Shoot Brief</span> · Electronic signatures are legally binding under UK law
          </div>
        </div>
      </div>
    </div>
  );
}
