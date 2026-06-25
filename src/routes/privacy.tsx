import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({ meta: [{ title: "Privacy policy — Shoot Brief" }] }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16 bg-background">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold">Privacy policy — coming soon</h1>
        <p className="mt-3 text-sm text-muted-foreground">Our privacy policy will be published here shortly.</p>
        <Link to="/" className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
          Back to homepage
        </Link>
      </div>
    </div>
  );
}
