import { createFileRoute, Link } from "@tanstack/react-router";
import { Check } from "lucide-react";

export const Route = createFileRoute("/welcome-pro")({
  head: () => ({ meta: [{ title: "Welcome to Pro — Shoot Brief" }] }),
  component: WelcomePro,
});

function WelcomePro() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="text-center max-w-md">
        <div className="mx-auto h-20 w-20 rounded-full bg-primary text-primary-foreground flex items-center justify-center animate-in zoom-in duration-500">
          <Check className="h-10 w-10" strokeWidth={3} />
        </div>
        <h1 className="mt-6 text-3xl font-bold">You're on Pro 🎉</h1>
        <p className="mt-2 text-muted-foreground">Everything is unlocked. Go plan something great.</p>
        <Link to="/dashboard" className="mt-6 inline-flex px-5 py-2.5 rounded-md bg-primary text-primary-foreground font-medium hover:opacity-90">
          Go to dashboard
        </Link>
      </div>
    </div>
  );
}
