import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/lib/auth";
import { Check, Loader2, Sparkles, Zap } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { createCheckoutSession, createCustomerPortalSession } from "@/lib/stripe.functions";

export const Route = createFileRoute("/billing")({
  component: () => <AppShell title="Billing"><BillingPage /></AppShell>,
});

const FREE_FEATURES = [
  "Up to 3 shoots",
  "Shot list builder",
  "Golden hour & weather",
  "Basic planner",
];

const PRO_FEATURES = [
  "Unlimited shoots",
  "Client portal with live tracking",
  "Booking requests & email notifications",
  "Shoot packages & pricing",
  "Client reviews on your booking page",
  "Contracts with digital client signing",
  "Professional invoicing & payment tracking",
  "Custom branding (logo, colours, font)",
  "Calendar sync (Google, Apple, Outlook)",
  "Expense tracking per shoot",
  "Recurring shoot series",
  "Inspiration board",
  "All 5 shoot templates",
  "PDF shoot brief export",
];

const STUDIO_EXTRAS = [
  "Everything in Pro",
  "Invoice payment links — clients pay by card",
  "Automated email sequences",
  "Pre-shoot reminders sent automatically",
  "Delivery & review follow-ups on autopilot",
];

function BillingPage() {
  const { profile } = useAuth();
  const isPro = !!profile?.is_pro;
  const isStudio = !!profile?.is_studio;
  const currentPlan = profile?.stripe_plan ?? (isPro ? "pro" : "free");

  const [busy, setBusy] = useState<string | null>(null);
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");

  const checkout = useServerFn(createCheckoutSession);
  const portal = useServerFn(createCustomerPortalSession);

  const upgrade = async (plan: "pro" | "studio") => {
    setBusy(plan);
    try {
      const { url } = await checkout({ data: { plan } });
      if (url) window.location.href = url;
    } catch (e: any) {
      toast.error(e?.message ?? "Could not start checkout");
    } finally {
      setBusy(null);
    }
  };

  const openPortal = async () => {
    setBusy("portal");
    try {
      const { url } = await portal();
      if (url) window.location.href = url;
    } catch (e: any) {
      toast.error(e?.message ?? "Could not open billing portal");
    } finally {
      setBusy(null);
    }
  };

  if (isPro || isStudio) {
    return (
      <div className="max-w-2xl">
        <h1 className="text-2xl font-bold">Billing</h1>
        <div className={`mt-5 rounded-lg border-2 p-6 ${isStudio ? "border-purple-400 bg-purple-50/30 dark:bg-purple-950/20" : "border-primary bg-primary-soft/30"}`}>
          <div className={`flex items-center gap-2 font-semibold ${isStudio ? "text-purple-600" : "text-primary"}`}>
            {isStudio ? <Zap className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
            {isStudio ? "Studio plan ✓" : "Pro plan ✓"}
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {isStudio
              ? "You have full access to all Studio features including payment links and automations."
              : "Manage your subscription, payment method, or cancel anytime via the billing portal."}
          </p>
          <button onClick={openPortal} disabled={!!busy} className={`mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium hover:opacity-90 disabled:opacity-60 text-white ${isStudio ? "bg-purple-600" : "bg-primary"}`}>
            {busy === "portal" && <Loader2 className="h-4 w-4 animate-spin" />} Manage billing
          </button>
          {!isStudio && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-3">Want payment links and automated emails? Upgrade to Studio.</p>
              <button onClick={() => upgrade("studio")} disabled={!!busy} className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-purple-600 text-white text-sm font-medium hover:opacity-90 disabled:opacity-60">
                {busy === "studio" && <Loader2 className="h-4 w-4 animate-spin" />}
                <Zap className="h-4 w-4" /> Upgrade to Studio — £15/month
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold">Billing</h1>
      <p className="text-muted-foreground mt-1 text-sm">Choose the plan that fits your photography business.</p>

      {/* Billing toggle */}
      <div className="mt-6 flex items-center gap-3">
        <span className="text-sm font-medium">Monthly</span>
        <button
          onClick={() => setBilling(b => b === "monthly" ? "yearly" : "monthly")}
          className={`relative w-10 h-6 rounded-full transition-colors ${billing === "yearly" ? "bg-primary" : "bg-muted"}`}
        >
          <span className={`absolute top-1 left-1 h-4 w-4 rounded-full bg-white transition-transform ${billing === "yearly" ? "translate-x-4" : ""}`} />
        </button>
        <span className="text-sm font-medium">Yearly</span>
        {billing === "yearly" && <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary text-primary-foreground">Save ~10%</span>}
      </div>

      <div className="mt-6 grid sm:grid-cols-3 gap-4">
        {/* Free */}
        <div className="rounded-lg border bg-card shadow-card p-5 flex flex-col">
          <div className="text-base font-semibold">Free</div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-3xl font-bold">£0</span>
            <span className="text-muted-foreground text-sm">forever</span>
          </div>
          <ul className="mt-4 space-y-2 text-sm flex-1">
            {FREE_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2 text-muted-foreground">
                <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" /> {f}
              </li>
            ))}
          </ul>
          <div className="mt-5 px-4 py-2 rounded-md border text-sm text-center text-muted-foreground">Current plan</div>
        </div>

        {/* Pro */}
        <div className="rounded-lg border-2 border-primary bg-card shadow-card p-5 flex flex-col relative">
          <span className="absolute -top-3 right-4 px-2 py-0.5 text-xs font-semibold rounded-full bg-primary text-primary-foreground">Most popular</span>
          <div className="text-base font-semibold flex items-center gap-1.5"><Sparkles className="h-4 w-4 text-primary" /> Pro</div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-3xl font-bold">{billing === "yearly" ? "£65" : "£6"}</span>
            <span className="text-muted-foreground text-sm">{billing === "yearly" ? "/year" : "/month"}</span>
          </div>
          {billing === "yearly" && <div className="text-xs text-primary font-medium">£5.42/month · save £7</div>}
          <ul className="mt-4 space-y-2 text-sm flex-1">
            {PRO_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2 text-muted-foreground">
                <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" /> {f}
              </li>
            ))}
          </ul>
          <button onClick={() => upgrade("pro")} disabled={!!busy} className="mt-5 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-60">
            {busy === "pro" && <Loader2 className="h-4 w-4 animate-spin" />}
            Get Pro — {billing === "yearly" ? "£65/year" : "£6/month"}
          </button>
        </div>

        {/* Studio */}
        <div className="rounded-lg border-2 border-purple-400 bg-card shadow-card p-5 flex flex-col">
          <div className="text-base font-semibold flex items-center gap-1.5"><Zap className="h-4 w-4 text-purple-600" /> Studio</div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-3xl font-bold">{billing === "yearly" ? "£150" : "£15"}</span>
            <span className="text-muted-foreground text-sm">{billing === "yearly" ? "/year" : "/month"}</span>
          </div>
          {billing === "yearly" && <div className="text-xs text-purple-600 font-medium">£12.50/month · save £30</div>}
          <ul className="mt-4 space-y-2 text-sm flex-1">
            {STUDIO_EXTRAS.map((f) => (
              <li key={f} className="flex items-start gap-2 text-muted-foreground">
                <Check className="h-4 w-4 text-purple-600 mt-0.5 shrink-0" /> {f}
              </li>
            ))}
          </ul>
          <button onClick={() => upgrade("studio")} disabled={!!busy} className="mt-5 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-purple-600 text-white text-sm font-medium hover:opacity-90 disabled:opacity-60">
            {busy === "studio" && <Loader2 className="h-4 w-4 animate-spin" />}
            Get Studio — {billing === "yearly" ? "£150/year" : "£15/month"}
          </button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground mt-4">All plans: cancel anytime. No contracts. Instant access after upgrade.</p>
    </div>
  );
}
