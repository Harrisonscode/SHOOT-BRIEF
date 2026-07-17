import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Loader2, ArrowLeft } from "lucide-react";

const searchSchema = z.object({
  tab: z.enum(["signin", "signup"]).optional(),
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/login")({
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: "Sign in — Shoot Brief" }] }),
  component: LoginPage,
});

function friendlyAuthError(msg: string) {
  const m = msg.toLowerCase();
  if (m.includes("rate limit") || m.includes("too many") || m.includes("for security purposes")) {
    return "Too many attempts. Please wait a few minutes before trying again.";
  }
  return msg;
}

function LoginPage() {
  const { tab, redirect } = Route.useSearch();
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">(tab === "signup" ? "signup" : "signin");
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // Sync tab from URL on every change (covers initial load + nav between links)
  useEffect(() => {
    setMode(tab === "signup" ? "signup" : "signin");
  }, [tab]);

  useEffect(() => {
    if (!loading && user) navigate({ to: (redirect as any) || "/dashboard" });
  }, [loading, user, navigate, redirect]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-6">
          <Link to="/"><Logo iconClassName="h-7 w-7" textClassName="text-lg" /></Link>
        </div>
        <div className="bg-card rounded-lg border shadow-card p-6 sm:p-8">
          {mode !== "forgot" && (
            <div className="flex gap-1 p-1 bg-muted rounded-md mb-6">
              <TabBtn active={mode === "signin"} onClick={() => { setMode("signin"); navigate({ to: "/login", search: { tab: "signin", redirect } as any, replace: true }); }}>Sign in</TabBtn>
              <TabBtn active={mode === "signup"} onClick={() => { setMode("signup"); navigate({ to: "/login", search: { tab: "signup", redirect } as any, replace: true }); }}>Sign up</TabBtn>
            </div>
          )}
          {mode === "signin" && <SignInForm onForgot={() => setMode("forgot")} redirectTo={redirect} />}
          {mode === "signup" && <SignUpForm redirectTo={redirect} />}
          {mode === "forgot" && <ForgotForm onBack={() => setMode("signin")} />}
        </div>
      </div>
    </div>
  );
}

function TabBtn({ children, active, onClick }: any) {
  return (
    <button onClick={onClick} className={`flex-1 py-2 text-sm font-medium rounded ${active ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
      {children}
    </button>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}

function inputCls(error?: boolean) {
  return `w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 ${
    error ? "border-destructive focus:ring-destructive/30" : "border-input focus:ring-primary/30 focus:border-primary"
  }`;
}

function Spinner() {
  return <Loader2 className="h-4 w-4 animate-spin" />;
}

function SignInForm({ onForgot, redirectTo }: { onForgot: () => void; redirectTo?: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setBusy(false);
      return toast.error(friendlyAuthError(error.message));
    }
    toast.success("Welcome back");
    navigate({ to: (redirectTo as any) || "/dashboard" });
  };

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <Field label="Email">
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls()} autoComplete="email" />
      </Field>
      <Field label="Password">
        <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls()} autoComplete="current-password" />
      </Field>
      <button disabled={busy} className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-md bg-primary text-primary-foreground font-medium hover:opacity-90 disabled:opacity-60">
        {busy ? <Spinner /> : "Sign in"}
      </button>
      <button type="button" onClick={onForgot} className="block w-full text-center text-sm text-muted-foreground hover:text-primary">Forgot password?</button>
    </form>
  );
}

function passwordStrength(pw: string): { score: 0 | 1 | 2 | 3; label: string; color: string } {
  if (pw.length < 8) return { score: 1, label: "Weak", color: "bg-red-500" };
  const hasMixed = /[a-z]/.test(pw) && /[A-Z]/.test(pw);
  const hasNumOrSym = /[0-9]/.test(pw) || /[^A-Za-z0-9]/.test(pw);
  if (hasMixed && hasNumOrSym) return { score: 3, label: "Strong", color: "bg-primary" };
  if (hasMixed || hasNumOrSym) return { score: 2, label: "Medium", color: "bg-amber-500" };
  return { score: 1, label: "Weak", color: "bg-red-500" };
}

function SignUpForm({ redirectTo }: { redirectTo?: string }) {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [pwError, setPwError] = useState<string | undefined>();
  const [confirmError, setConfirmError] = useState<string | undefined>();
  const navigate = useNavigate();

  const strength = useMemo(() => passwordStrength(password), [password]);
  const showMismatch = confirm.length > 0 && confirm !== password;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError(undefined); setConfirmError(undefined);
    if (password.length < 8) { setPwError("Password must be at least 8 characters"); return; }
    if (password !== confirm) { setConfirmError("Passwords don't match"); return; }
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin + "/dashboard",
        data: { display_name: displayName },
      },
    });
    if (error) {
      setBusy(false);
      return toast.error(friendlyAuthError(error.message));
    }
    // If email confirmation is required, Supabase returns a user but no session
    if (data.user && !data.session) {
      navigate({ to: "/check-email", search: { email } as any });
      return;
    }
    toast.success("Welcome to Shoot Brief 👋");
    navigate({ to: (redirectTo as any) || "/dashboard" });
  };

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <Field label="Display name">
        <input required value={displayName} onChange={(e) => setDisplayName(e.target.value)} className={inputCls()} autoComplete="name" />
      </Field>
      <Field label="Email">
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls()} autoComplete="email" />
      </Field>
      <Field label="Password" error={pwError}>
        <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls(!!pwError)} autoComplete="new-password" />
        {password.length > 0 && (
          <div className="mt-2">
            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden flex gap-0.5">
              <div className={`h-full flex-1 ${strength.score >= 1 ? strength.color : "bg-muted"}`} />
              <div className={`h-full flex-1 ${strength.score >= 2 ? strength.color : "bg-muted"}`} />
              <div className={`h-full flex-1 ${strength.score >= 3 ? strength.color : "bg-muted"}`} />
            </div>
            <div className="mt-1 text-xs text-muted-foreground">Password strength: <span className="font-medium text-foreground">{strength.label}</span></div>
          </div>
        )}
      </Field>
      <Field label="Confirm password" error={confirmError ?? (showMismatch ? "Passwords don't match" : undefined)}>
        <input type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} className={inputCls(!!confirmError || showMismatch)} autoComplete="new-password" />
      </Field>
      <button disabled={busy} className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-md bg-primary text-primary-foreground font-medium hover:opacity-90 disabled:opacity-60">
        {busy ? <Spinner /> : "Create account"}
      </button>
    </form>
  );
}

function ForgotForm({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(undefined); setBusy(true);
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/login",
    });
    setBusy(false);
    if (err) {
      const msg = err.message.toLowerCase();
      if (msg.includes("not found") || msg.includes("no user") || msg.includes("invalid")) {
        setError("No account found with that email.");
      } else {
        setError(friendlyAuthError(err.message));
      }
      return;
    }
    setSuccess(true);
  };

  return (
    <div>
      <button type="button" onClick={onBack} className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to sign in
      </button>
      <h2 className="text-lg font-semibold mb-1">Reset your password</h2>
      <p className="text-sm text-muted-foreground mb-4">Enter your email and we'll send you a reset link.</p>
      {success ? (
        <div className="rounded-md bg-primary-soft border border-primary/30 px-3 py-3 text-sm text-foreground">
          Check your email for a reset link.
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4" noValidate>
          <Field label="Email" error={error}>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls(!!error)} autoComplete="email" />
          </Field>
          <button disabled={busy} className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-md bg-primary text-primary-foreground font-medium hover:opacity-90 disabled:opacity-60">
            {busy ? <Spinner /> : "Send reset link"}
          </button>
        </form>
      )}
    </div>
  );
}
