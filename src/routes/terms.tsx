import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  head: () => ({ meta: [{ title: "Terms of use — Shoot Brief" }] }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16 bg-background">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold">Terms of use — coming soon</h1>
        <p className="mt-3 text-sm text-muted-foreground">Our terms of use will be published here shortly.</p>
        <Link to="/" className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
          Back to homepage
        </Link>
      </div>
    </div>
  );
}
