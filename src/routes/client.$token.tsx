import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ApertureIcon } from "@/components/Logo";
import { format, differenceInDays } from "date-fns";
import { Star } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/client/$token")({
  head: () => ({ meta: [{ title: "Your Shoot — Shoot Brief" }] }),
  component: ClientPortal,
});

type PortalShoot = {
  id: string;
  name: string;
  date: string | null;
  location: string | null;
  shoot_type: string | null;
  client_name: string | null;
  client_notes: string | null;
  gallery_link: string | null;
  editing_progress: number | null;
  final_delivery_date: string | null;
  contract_status: string | null;
  payment_status: string | null;
  photographer_id: string;
  profiles: {
    display_name: string | null;
    business_name: string | null;
    email: string | null;
    phone: string | null;
    website: string | null;
  } | null;
  packages: {
    name: string;
    description: string | null;
    price: number | null;
    currency: string;
    duration_hours: number | null;
    deliverables: string | null;
  } | null;
};

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          onMouseEnter={() => setHovered(i)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(i)}
          className="p-0.5"
        >
          <Star className={`h-7 w-7 transition-colors ${i <= (hovered || value) ? "fill-amber-400 text-amber-400" : "text-gray-200"}`} />
        </button>
      ))}
    </div>
  );
}

function fmt(price: number | null, currency: string) {
  if (price === null) return "POA";
  const sym: Record<string, string> = { GBP: "£", USD: "$", EUR: "€" };
  return `${sym[currency] ?? currency}${price.toLocaleString("en-GB", { minimumFractionDigits: 0 })}`;
}

function ClientPortal() {
  const { token } = Route.useParams();
  const [shoot, setShoot] = useState<PortalShoot | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [hasReview, setHasReview] = useState(false);

  // Review form
  const [rating, setRating] = useState(0);
  const [reviewBody, setReviewBody] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewDone, setReviewDone] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("shoots")
        .select(`
          id, name, date, location, shoot_type, photographer_id,
          client_name, client_notes, gallery_link,
          editing_progress, final_delivery_date,
          contract_status, payment_status,
          profiles ( display_name, business_name, email, phone, website ),
          packages ( name, description, price, currency, duration_hours, deliverables )
        `)
        .eq("client_token", token)
        .maybeSingle();

      if (error || !data) { setNotFound(true); return; }
      setShoot(data as any);

      // Check if review already submitted for this shoot
      const { count } = await supabase
        .from("reviews")
        .select("id", { count: "exact", head: true })
        .eq("shoot_id", (data as any).id);
      if ((count ?? 0) > 0) setHasReview(true);
    })();
  }, [token]);

  const submitReview = async () => {
    if (!shoot || rating === 0) { toast.error("Please select a star rating"); return; }
    setSubmittingReview(true);
    const { error } = await supabase.from("reviews").insert({
      shoot_id: shoot.id,
      photographer_id: shoot.photographer_id,
      client_name: shoot.client_name || "Anonymous",
      rating,
      body: reviewBody.trim() || null,
      approved: false,
    } as any);
    setSubmittingReview(false);
    if (error) { toast.error("Something went wrong, please try again"); return; }
    setReviewDone(true);
    setHasReview(true);
  };

  if (notFound) return (
    <div className="min-h-screen bg-[#f8faf7] flex items-center justify-center p-6">
      <div className="text-center">
        <div className="text-5xl mb-4">📷</div>
        <h1 className="text-xl font-semibold text-gray-800">This link isn't valid</h1>
        <p className="text-gray-500 mt-2 text-sm">It may have expired or the shoot was deleted.</p>
      </div>
    </div>
  );

  if (!shoot) return (
    <div className="min-h-screen bg-[#f8faf7] flex items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#4f8a1f] border-t-transparent" />
    </div>
  );

  const pct = Math.min(100, Math.max(0, shoot.editing_progress ?? 0));
  const photographer = shoot.profiles;
  const pkg = shoot.packages;
  const shootDate = shoot.date ? new Date(shoot.date + "T00:00:00") : null;
  const deliveryDate = shoot.final_delivery_date ? new Date(shoot.final_delivery_date + "T00:00:00") : null;
  const today = new Date();
  const deliveryPassed = pct === 100 || (deliveryDate ? today >= deliveryDate : false);

  const stages = [
    {
      key: "shoot",
      label: "Shoot day",
      date: shootDate,
      done: shootDate ? today > shootDate : false,
      icon: "📷",
    },
    {
      key: "editing",
      label: "Editing",
      date: null,
      done: pct === 100,
      active: pct > 0 && pct < 100,
      icon: "✏️",
    },
    {
      key: "delivery",
      label: "Delivery",
      date: deliveryDate,
      done: deliveryPassed,
      icon: "🎉",
    },
  ];

  const contractLabel: Record<string, string> = {
    unsigned: "Not yet signed", sent: "Sent for signature", signed: "Signed ✓",
  };
  const paymentLabel: Record<string, string> = {
    unpaid: "Awaiting payment", deposit_paid: "Deposit received", paid: "Paid in full ✓",
  };

  const contractOk = shoot.contract_status === "signed";
  const paymentOk = shoot.payment_status === "paid";
  const depositOk = shoot.payment_status === "deposit_paid" || paymentOk;

  return (
    <div className="min-h-screen bg-[#f8faf7]">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-2">
        <span style={{ color: "#4f8a1f" }}><ApertureIcon className="h-5 w-5" color="#4f8a1f" /></span>
        <span className="text-sm font-semibold text-gray-700">Shoot Brief</span>
        {photographer?.business_name && (
          <span className="text-sm text-gray-400 ml-1">· {photographer.business_name}</span>
        )}
      </div>

      <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
        {/* Header */}
        <div>
          <p className="text-sm text-gray-400 uppercase tracking-wide font-medium mb-1">
            {shoot.client_name ? `Hi ${shoot.client_name.split(" ")[0]} 👋` : "Your shoot"}
          </p>
          <h1 className="text-3xl font-bold text-gray-900">{shoot.name}</h1>
          {(shoot.date || shoot.location) && (
            <p className="text-gray-500 mt-1">
              {shootDate ? format(shootDate, "EEEE d MMMM yyyy") : ""}
              {shoot.location ? ` · ${shoot.location}` : ""}
            </p>
          )}
        </div>

        {/* Package */}
        {pkg && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Your package</h2>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="font-bold text-gray-900 text-lg">{pkg.name}</div>
                {pkg.description && <p className="text-sm text-gray-500 mt-1">{pkg.description}</p>}
                <div className="flex gap-3 mt-2 text-sm text-gray-500 flex-wrap">
                  {pkg.duration_hours && <span>⏱ {pkg.duration_hours}h shoot</span>}
                  {pkg.deliverables && <span>📁 {pkg.deliverables}</span>}
                </div>
              </div>
              {pkg.price !== null && (
                <div className="text-2xl font-bold text-[#4f8a1f] shrink-0">
                  {fmt(pkg.price, pkg.currency)}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Timeline */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-6">Timeline</h2>
          <div className="relative">
            <div className="absolute top-5 left-5 right-5 h-0.5 bg-gray-200" style={{ zIndex: 0 }} />
            <div
              className="absolute top-5 left-5 h-0.5 bg-[#4f8a1f] transition-all duration-700"
              style={{
                zIndex: 1,
                width: stages[2].done
                  ? "calc(100% - 40px)"
                  : stages[1].done || stages[1].active
                  ? "calc(50% - 20px)"
                  : stages[0].done
                  ? "calc(25% - 10px)"
                  : "0%",
              }}
            />
            <div className="relative flex justify-between" style={{ zIndex: 2 }}>
              {stages.map((stage) => (
                <div key={stage.key} className="flex flex-col items-center gap-2" style={{ width: "33%" }}>
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center text-lg border-2 transition-all ${
                    stage.done ? "bg-[#4f8a1f] border-[#4f8a1f]"
                    : (stage as any).active ? "bg-white border-[#4f8a1f] ring-4 ring-[#4f8a1f]/20"
                    : "bg-white border-gray-200"
                  }`}>
                    {stage.done ? "✓" : stage.icon}
                  </div>
                  <div className="text-center">
                    <div className={`text-xs font-semibold ${stage.done || (stage as any).active ? "text-[#4f8a1f]" : "text-gray-400"}`}>
                      {stage.label}
                    </div>
                    {stage.date && (
                      <div className="text-xs text-gray-400 mt-0.5">{format(stage.date, "d MMM")}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {pct > 0 && (
            <div className="mt-8">
              <div className="flex justify-between text-xs text-gray-400 mb-1.5">
                <span>Editing progress</span>
                <span className="font-semibold text-[#4f8a1f]">{pct}%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-[#4f8a1f] rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
              </div>
              {deliveryDate && pct < 100 && (
                <p className="text-xs text-gray-400 mt-2">
                  Expected delivery: <span className="font-medium text-gray-600">{format(deliveryDate, "EEEE d MMMM yyyy")}</span>
                  {differenceInDays(deliveryDate, today) > 0 && <> · {differenceInDays(deliveryDate, today)} days to go</>}
                </p>
              )}
              {pct === 100 && <p className="text-xs text-[#4f8a1f] font-medium mt-2">Editing complete! 🎉</p>}
            </div>
          )}
        </div>

        {/* Status cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className={`bg-white rounded-xl border shadow-sm p-4 ${contractOk ? "border-[#4f8a1f]/30" : "border-gray-100"}`}>
            <div className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">Contract</div>
            <div className={`text-sm font-semibold ${contractOk ? "text-[#4f8a1f]" : "text-gray-600"}`}>
              {contractLabel[shoot.contract_status ?? "unsigned"] ?? "Not set"}
            </div>
          </div>
          <div className={`bg-white rounded-xl border shadow-sm p-4 ${paymentOk ? "border-[#4f8a1f]/30" : depositOk ? "border-amber-200" : "border-gray-100"}`}>
            <div className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">Payment</div>
            <div className={`text-sm font-semibold ${paymentOk ? "text-[#4f8a1f]" : depositOk ? "text-amber-600" : "text-gray-600"}`}>
              {paymentLabel[shoot.payment_status ?? "unpaid"] ?? "Not set"}
            </div>
          </div>
        </div>

        {/* Gallery link */}
        {shoot.gallery_link && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Your gallery</h2>
            <a
              href={shoot.gallery_link}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#4f8a1f] text-white text-sm font-medium hover:opacity-90 transition-opacity"
            >
              📁 View your photos →
            </a>
          </div>
        )}

        {/* Notes */}
        {shoot.client_notes && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Message from your photographer</h2>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{shoot.client_notes}</p>
          </div>
        )}

        {/* Review form — only show if editing is done */}
        {pct === 100 && !hasReview && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Leave a review</h2>
            <p className="text-sm text-gray-500 mb-4">How was your experience?</p>
            {reviewDone ? (
              <div className="text-center py-4">
                <div className="text-3xl mb-2">🙏</div>
                <p className="font-semibold text-gray-800">Thank you for your feedback!</p>
                <p className="text-sm text-gray-500 mt-1">Your review has been submitted and is awaiting approval.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <StarPicker value={rating} onChange={setRating} />
                <textarea
                  value={reviewBody}
                  onChange={(e) => setReviewBody(e.target.value)}
                  placeholder="Tell us about your experience (optional)..."
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#4f8a1f]/30 focus:border-[#4f8a1f]"
                />
                <button
                  onClick={submitReview}
                  disabled={submittingReview || rating === 0}
                  className="w-full py-2.5 rounded-xl bg-[#4f8a1f] text-white font-semibold text-sm hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {submittingReview ? "Submitting…" : "Submit review"}
                </button>
              </div>
            )}
          </div>
        )}

        {hasReview && !reviewDone && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-center text-sm text-gray-500">
            ✓ You've already submitted a review — thank you!
          </div>
        )}

        {/* Photographer contact */}
        {photographer && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Your photographer</h2>
            <div className="font-semibold text-gray-800">{photographer.business_name || photographer.display_name || "—"}</div>
            {photographer.display_name && photographer.business_name && (
              <div className="text-sm text-gray-500 mt-0.5">{photographer.display_name}</div>
            )}
            <div className="mt-3 space-y-1">
              {photographer.email && (
                <a href={`mailto:${photographer.email}`} className="flex items-center gap-2 text-sm text-[#4f8a1f] hover:underline">
                  ✉️ {photographer.email}
                </a>
              )}
              {photographer.phone && (
                <a href={`tel:${photographer.phone}`} className="flex items-center gap-2 text-sm text-[#4f8a1f] hover:underline">
                  📞 {photographer.phone}
                </a>
              )}
              {photographer.website && (
                <a href={photographer.website} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-[#4f8a1f] hover:underline">
                  🌐 {photographer.website}
                </a>
              )}
            </div>
          </div>
        )}

        <div className="text-center text-xs text-gray-300 pb-6">
          Powered by <span className="font-medium">Shoot Brief</span>
        </div>
      </div>
    </div>
  );
}
