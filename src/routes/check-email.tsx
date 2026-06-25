import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { Mail, Loader2 } from "lucide-react";
import { toast } from "sonner";

const searchSchema = z.object({ email: z.string().optional() });

export const Route = createFileRoute("/check-email")({
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: "Check your inbox — Shoot Brief" }] }),
  component: CheckEmailPage,
});

function CheckEmailPage() {
  const { email } = Route.useSearch();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  const resend = async () => {
    if (!email) { toast.error("Missing email address"); return; }
    setBusy(true);
    const { error } = await supabase.auth.resend({ type: "signup", email });
    setBusy(false);
    if (error) {
      const msg = error.message.toLowerCase();
      toast.error(msg.includes("rate") || msg.includes("too many")
        ? "Too many attempts. Please wait a few minutes before trying again."
        : error.message);
      return;
    }
    toast.success("Confirmation email re-sent");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-6">
          <Link to="/"><Logo iconClassName="h-7 w-7" textClassName="text-lg" /></Link>
        </div>
        <div className="bg-card rounded-lg border shadow-card p-8 text-center">
          <div className="mx-auto h-14 w-14 rounded-full bg-primary-soft text-primary flex items-center justify-center">
            <Mail className="h-7 w-7" />
          </div>
          <h1 className="mt-5 text-xl font-semibold">Check your inbox</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            We sent a confirmation link to <span className="font-medium text-foreground">{email ?? "your email"}</span>. Click it to activate your account.
          </p>
          <button
            onClick={resend}
            disabled={busy}
            className="mt-6 w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-md bg-primary text-primary-foreground font-medium hover:opacity-90 disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Resend email"}
          </button>
          <button
            onClick={() => navigate({ to: "/login", search: { tab: "signin" } as any })}
            className="mt-3 text-sm text-muted-foreground hover:text-foreground"
          >
            Back to sign in
          </button>
        </div>
      </div>
    </div>
  );
}
