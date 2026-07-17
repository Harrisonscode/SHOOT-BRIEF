import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, Loader2 } from "lucide-react";
import { ApertureIcon } from "@/components/Logo";

export const Route = createFileRoute("/sign/$token")({
  component: SignPage,
});

function SignPage() {
  const { token } = Route.useParams();
  const [contract, setContract] = useState<any | null>(null);
  const [photographer, setPhotographer] = useState<any | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [name, setName] = useState("");
  const [signing, setSigning] = useState(false);
  const [signed, setSigned] = useState(false);

  useEffect(() => {
    supabase
      .from("contracts")
      .select("*, shoots(name, client_name, date, location), profiles!contracts_user_id_fkey(display_name, business_name, email, phone, website, brand_color, logo_url)")
      .eq("client_token", token)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) { setNotFound(true); return; }
        setContract(data);
        setPhotographer((data as any).profiles);
        if (data.status === "signed") setSigned(true);
        if (data.shoots?.client_name) setName(data.shoots.client_name);
      });
  }, [token]);

  const sign = async () => {
    if (!name.trim()) { alert("Please enter your full name to sign"); return; }
    setSigning(true);
    await supabase.from("contracts").update({
      status: "signed",
      signed_at: new Date().toISOString(),
      signed_name: name.trim(),
    } as any).eq("id", contract.id);
    setSigning(false);
    setSigned(true);
  };

  const brandColor = photographer?.brand_color || "#4f8a1f";

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
    <div className="min-h-screen bg-[#f8faf7]">
      {/* Top bar */}
      <div
        className="fixed top-0 inset-x-0 z-50 bg-white border-b border-gray-100 flex items-center gap-3 px-4"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: '12px', height: 'calc(52px + env(safe-area-inset-top, 0px))' }}
      >
        <span style={{ color: brandColor }}><ApertureIcon className="h-5 w-5" color={brandColor} /></span>
        <span className="text-sm font-semibold text-gray-700">{photographer?.business_name || photographer?.display_name || "Shoot Brief"}</span>
      </div>

      <div style={{ paddingTop: 'calc(52px + env(safe-area-inset-top, 0px))' }}>
        <div className="max-w-2xl mx-auto px-4 py-10">

          {signed ? (
            <div className="text-center py-16">
              <CheckCircle className="h-16 w-16 mx-auto mb-4" style={{ color: brandColor }} />
              <h1 className="text-2xl font-bold text-gray-900">Contract signed!</h1>
              <p className="text-gray-500 mt-2">Thank you for signing. {photographer?.business_name || photographer?.display_name} will be in touch shortly.</p>
              {photographer?.email && (
                <p className="text-sm text-gray-400 mt-4">Questions? Email <a href={`mailto:${photographer.email}`} className="underline" style={{ color: brandColor }}>{photographer.email}</a></p>
              )}
            </div>
          ) : (
            <>
              {/* Photographer info */}
              <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">{contract.title}</h1>
                {contract.shoots && (
                  <p className="text-gray-500 mt-1 text-sm">{contract.shoots.name}{contract.shoots.client_name ? ` · ${contract.shoots.client_name}` : ""}</p>
                )}
                <div className="mt-3 flex items-center gap-1.5 text-sm" style={{ color: brandColor }}>
                  <span className="font-medium">{photographer?.business_name || photographer?.display_name}</span>
                </div>
              </div>

              {/* Contract body */}
              <div className="rounded-xl border bg-white p-6 sm:p-8 shadow-sm mb-8">
                <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {contract.body}
                </div>
              </div>

              {/* Signature */}
              <div className="rounded-xl border bg-white p-6 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-4">Sign this contract</h3>
                <p className="text-sm text-gray-500 mb-4">
                  By typing your full name and clicking "Sign contract" below, you agree to the terms of this contract. This constitutes a legally binding electronic signature.
                </p>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Your full name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Type your full legal name"
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:border-transparent"
                    style={{ '--tw-ring-color': brandColor } as any}
                  />
                </div>
                {name.trim() && (
                  <div className="mb-4 p-3 rounded-lg border bg-gray-50">
                    <div className="text-xs text-gray-400 mb-1">Signature preview</div>
                    <div className="text-2xl text-gray-600" style={{ fontFamily: "Georgia, serif", fontStyle: "italic" }}>{name}</div>
                  </div>
                )}
                <button
                  onClick={sign}
                  disabled={!name.trim() || signing}
                  className="w-full py-3 rounded-xl text-white font-semibold text-sm hover:opacity-90 disabled:opacity-60 transition-opacity flex items-center justify-center gap-2"
                  style={{ backgroundColor: brandColor }}
                >
                  {signing && <Loader2 className="h-4 w-4 animate-spin" />}
                  {signing ? "Signing…" : "Sign contract"}
                </button>
                <p className="text-xs text-gray-400 text-center mt-3">
                  Signed on {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                </p>
              </div>
            </>
          )}

          <div className="text-center text-xs text-gray-300 pb-6 mt-8">
            Powered by <span className="font-medium">Shoot Brief</span>
          </div>
        </div>
      </div>
    </div>
  );
}
