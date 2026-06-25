import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/lib/auth";
import { Check, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { createCheckoutSession, createCustomerPortalSession } from "@/lib/stripe.functions";

export const Route = createFileRoute("/billing")({
  component: () => <AppShell title="Billing"><BillingPage /></AppShell>,
});

const PRO_FEATURES = [
  "Unlimited shoots",
  "All 5 shoot templates",
  "Weather forecast on every shoot",
  "Gear bag memory",
  "Inspiration board",
  "Client brief PDF export (coming soon)",
];

function BillingPage() {
  const { profile } = useAuth();
  const isPro = !!profile?.is_pro;
  const [busy, setBusy] = useState(false);

  const checkout = useServerFn(createCheckoutSession);
  const portal = useServerFn(createCustomerPortalSession);

  const upgrade = async () => {
    setBusy(true);
    try {
      const { url } = await checkout();
      if (url) window.location.href = url;
    } catch (e: any) {
      toast.error(e?.message ?? "Could not start checkout");
    } finally {
      setBusy(false);
    }
  };

  const openPortal = async () => {
    setBusy(true);
    try {
      const { url } = await portal();
      if (url) window.location.href = url;
    } catch (e: any) {
      toast.error(e?.message ?? "Could not open billing portal");
    } finally {
      setBusy(false);
    }
  };

  if (isPro) {
    return (
      <div className="max-w-2xl">
        <h1 className="text-2xl font-bold">Billing</h1>
        <div className="mt-5 rounded-lg border-2 border-primary bg-primary-soft/30 p-6">
          <div className="flex items-center gap-2 text-primary font-semibold">
            <Sparkles className="h-5 w-5" /> Pro plan ✓
          </div>
          <p className="mt-2 text-sm text-muted-foreground">Manage your subscription, payment method, or cancel anytime via the billing portal.</p>
          <button onClick={openPortal} disabled={busy} className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-60">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Manage billing
          </button>
          <p className="mt-4 text-sm italic text-muted-foreground">Thanks for supporting Shoot Brief.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold">Billing</h1>
      <div className="mt-5 rounded-lg border bg-card shadow-card p-6">
        <div className="text-sm text-muted-foreground">Current plan</div>
        <div className="text-xl font-semibold mt-1">Free plan</div>

        <div className="mt-6">
          <div className="text-sm font-medium mb-2">Unlock with Pro:</div>
          <ul className="space-y-2 text-sm">
            {PRO_FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-2 text-muted-foreground">
                <Check className="h-4 w-4 text-primary" /> {f}
              </li>
            ))}
          </ul>
        </div>

        <button onClick={upgrade} disabled={busy} className="mt-6 inline-flex items-center gap-2 w-full sm:w-auto justify-center px-6 py-3 rounded-md bg-primary text-primary-foreground font-medium hover:opacity-90 disabled:opacity-60">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Upgrade to Pro — £6/month
        </button>
        <div className="mt-2 text-xs text-muted-foreground">Cancel anytime. No contracts.</div>
      </div>
    </div>
  );
}
