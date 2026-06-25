import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ApertureIcon } from "@/components/Logo";
import { toast } from "sonner";

export const Route = createFileRoute("/book/$slug")({
  head: () => ({ meta: [{ title: "Book a Shoot" }] }),
  component: BookingPage,
});

const SHOOT_TYPES = [
  "Wedding", "Portrait", "Commercial", "Event", "Sports",
  "Nightlife", "Product", "Real Estate", "Fashion", "Other",
];

type Photographer = {
  id: string;
  display_name: string | null;
  business_name: string | null;
  email: string | null;
  website: string | null;
  booking_intro: string | null;
  booking_active: boolean;
};

function BookingPage() {
  const { slug } = Route.useParams();
  const [photographer, setPhotographer] = useState<Photographer | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);

  const [form, setForm] = useState({
    client_name: "",
    client_email: "",
    client_phone: "",
    shoot_type: "",
    preferred_date: "",
    budget: "",
    location: "",
    message: "",
  });

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, business_name, email, website, booking_intro, booking_active")
        .eq("booking_slug", slug)
        .maybeSingle();
      if (error || !data) { setNotFound(true); return; }
      setPhotographer(data as any);
    })();
  }, [slug]);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!photographer) return;
    if (!form.client_name.trim() || !form.client_email.trim()) {
      toast.error("Please fill in your name and email");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.client_email)) {
      toast.error("Please enter a valid email address");
      return;
    }
    setSending(true);
    const { error } = await supabase.from("booking_requests").insert({
      photographer_id: photographer.id,
      client_name: form.client_name.trim(),
      client_email: form.client_email.trim(),
      client_phone: form.client_phone.trim() || null,
      shoot_type: form.shoot_type || null,
      preferred_date: form.preferred_date || null,
      budget: form.budget.trim() || null,
      location: form.location.trim() || null,
      message: form.message.trim() || null,
    } as any);
    setSending(false);
    if (error) { toast.error("Something went wrong, please try again"); return; }
    setSubmitted(true);
  };

  if (notFound) return (
    <div className="min-h-screen bg-[#f8faf7] flex items-center justify-center p-6">
      <div className="text-center">
        <div className="text-5xl mb-4">📷</div>
        <h1 className="text-xl font-semibold text-gray-800">Booking page not found</h1>
        <p className="text-gray-500 mt-2 text-sm">This link may be invalid or the photographer has disabled bookings.</p>
      </div>
    </div>
  );

  if (!photographer) return (
    <div className="min-h-screen bg-[#f8faf7] flex items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#4f8a1f] border-t-transparent" />
    </div>
  );

  if (!photographer.booking_active) return (
    <div className="min-h-screen bg-[#f8faf7] flex items-center justify-center p-6">
      <div className="text-center">
        <div className="text-5xl mb-4">📷</div>
        <h1 className="text-xl font-semibold text-gray-800">{photographer.business_name || photographer.display_name} isn't taking bookings right now</h1>
        <p className="text-gray-500 mt-2 text-sm">Check back later or reach out directly.</p>
      </div>
    </div>
  );

  if (submitted) return (
    <div className="min-h-screen bg-[#f8faf7] flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <div className="h-16 w-16 rounded-full bg-[#4f8a1f] flex items-center justify-center mx-auto text-white text-3xl">✓</div>
        <h1 className="text-2xl font-bold text-gray-900 mt-5">Request sent!</h1>
        <p className="text-gray-500 mt-2">
          Thanks {form.client_name.split(" ")[0]}! {photographer.business_name || photographer.display_name} will be in touch soon.
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8faf7]">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-2">
        <span style={{ color: "#4f8a1f" }}><ApertureIcon className="h-5 w-5" color="#4f8a1f" /></span>
        <span className="text-sm font-semibold text-gray-700">Shoot Brief</span>
      </div>

      <div className="max-w-xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Book with {photographer.business_name || photographer.display_name}
          </h1>
          {photographer.booking_intro && (
            <p className="text-gray-500 mt-3 leading-relaxed">{photographer.booking_intro}</p>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
          {/* Name + Email */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Your name *</label>
              <input
                value={form.client_name}
                onChange={(e) => set("client_name", e.target.value)}
                placeholder="Sarah Johnson"
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#4f8a1f]/30 focus:border-[#4f8a1f]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Email *</label>
              <input
                type="email"
                value={form.client_email}
                onChange={(e) => set("client_email", e.target.value)}
                placeholder="sarah@example.com"
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#4f8a1f]/30 focus:border-[#4f8a1f]"
              />
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Phone number</label>
            <input
              type="tel"
              value={form.client_phone}
              onChange={(e) => set("client_phone", e.target.value)}
              placeholder="+44 7700 000000"
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#4f8a1f]/30 focus:border-[#4f8a1f]"
            />
          </div>

          {/* Shoot type */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Type of shoot</label>
            <div className="flex flex-wrap gap-2">
              {SHOOT_TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => set("shoot_type", form.shoot_type === t ? "" : t)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                    form.shoot_type === t
                      ? "bg-[#4f8a1f] text-white border-[#4f8a1f]"
                      : "bg-white text-gray-600 border-gray-200 hover:border-[#4f8a1f]/40"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Date + Location */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Preferred date</label>
              <input
                type="date"
                value={form.preferred_date}
                onChange={(e) => set("preferred_date", e.target.value)}
                min={new Date().toISOString().slice(0, 10)}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#4f8a1f]/30 focus:border-[#4f8a1f]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Location / venue</label>
              <input
                value={form.location}
                onChange={(e) => set("location", e.target.value)}
                placeholder="Manchester city centre"
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#4f8a1f]/30 focus:border-[#4f8a1f]"
              />
            </div>
          </div>

          {/* Budget */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Budget</label>
            <input
              value={form.budget}
              onChange={(e) => set("budget", e.target.value)}
              placeholder="e.g. £500–£800"
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#4f8a1f]/30 focus:border-[#4f8a1f]"
            />
          </div>

          {/* Message */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Tell me about your shoot</label>
            <textarea
              value={form.message}
              onChange={(e) => set("message", e.target.value)}
              placeholder="Any details about what you have in mind, style references, number of people, etc."
              rows={4}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#4f8a1f]/30 focus:border-[#4f8a1f] resize-none"
            />
          </div>

          <button
            onClick={submit}
            disabled={sending}
            className="w-full py-3 rounded-xl bg-[#4f8a1f] text-white font-semibold text-sm hover:opacity-90 disabled:opacity-60 transition-opacity"
          >
            {sending ? "Sending…" : "Send booking request"}
          </button>
        </div>

        <div className="text-center text-xs text-gray-300 mt-8">
          Powered by <span className="font-medium">Shoot Brief</span>
        </div>
      </div>
    </div>
  );
}
