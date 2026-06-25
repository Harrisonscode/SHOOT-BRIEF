import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Logo } from "@/components/Logo";
import { Sun, ListChecks, LayoutTemplate, CloudSun, Check, Menu, X } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Shoot Brief — Plan better shoots. Miss nothing." },
      { name: "description", content: "Automatic golden hour, live weather, visual shot lists and templates — built for photographers who take their work seriously." },
      { property: "og:title", content: "Shoot Brief" },
      { property: "og:description", content: "Plan better shoots. Miss nothing." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b relative">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <Logo />
          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-2">
            <Link to="/login" search={{ tab: "signin" } as any} className="px-3 py-2 text-sm font-medium hover:text-primary">Log in</Link>
            <Link to="/login" search={{ tab: "signup" } as any} className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">Start free</Link>
          </div>
          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="md:hidden p-2 text-primary"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
          >
            {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
        {menuOpen && (
          <div className="md:hidden absolute top-full inset-x-0 bg-background border-b shadow-card z-40">
            <div className="px-6 py-3 flex flex-col gap-1">
              <Link
                to="/login"
                search={{ tab: "signin" } as any}
                onClick={() => setMenuOpen(false)}
                className="py-3 text-sm font-medium hover:text-primary"
              >Log in</Link>
              <Link
                to="/login"
                search={{ tab: "signup" } as any}
                onClick={() => setMenuOpen(false)}
                className="py-3 text-sm font-medium text-primary"
              >Start free</Link>
            </div>
          </div>
        )}
      </header>

      <section className="mx-auto max-w-6xl px-6 pt-20 pb-16 text-center">
        <h1 className="text-5xl sm:text-6xl font-bold tracking-tight leading-[1.05]">
          Plan better shoots.<br /><span className="text-primary">Miss nothing.</span>
        </h1>
        <p className="mt-6 max-w-2xl mx-auto text-lg text-muted-foreground">
          Automatic golden hour times, live weather, visual shot lists and templates — built for photographers who take their work seriously.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/login" search={{ tab: "signup" } as any} className="px-6 py-3 rounded-md bg-primary text-primary-foreground font-medium hover:opacity-90">Start free</Link>
          <a href="#features" className="px-6 py-3 rounded-md border border-border bg-background font-medium hover:bg-muted">See how it works</a>
        </div>

        <div className="mt-16 mx-auto max-w-4xl">
          <div className="rounded-xl border bg-card shadow-card overflow-hidden">
            <div className="bg-sidebar text-white px-4 py-3 flex items-center gap-2 text-xs">
              <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
              <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
              <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
              <span className="ml-2 opacity-60">shootbriefplanner.com/planner</span>
            </div>
            <div className="grid grid-cols-12 min-h-[320px]">
              <div className="col-span-3 bg-sidebar text-white/80 p-4 text-xs space-y-2">
                <div className="opacity-70">Navigation</div>
                <div className="px-2 py-1.5 rounded bg-white/5">Dashboard</div>
                <div className="px-2 py-1.5 rounded border-l-2 border-primary bg-[color:var(--sidebar-active)] text-white">New Shoot</div>
                <div className="px-2 py-1.5 rounded">Calendar</div>
                <div className="px-2 py-1.5 rounded">Inspiration</div>
              </div>
              <div className="col-span-9 p-6 bg-background text-left">
                <div className="text-2xl font-semibold">Rooftop Portrait — Maya</div>
                <div className="text-sm text-muted-foreground mt-1">Fri 4 July · 7:45pm · Brooklyn, NY</div>
                <div className="mt-5 grid grid-cols-3 gap-3">
                  {[
                    { l: "Sunrise", t: "5:32am", c: "bg-amber-300" },
                    { l: "Golden hr", t: "7:48pm", c: "bg-orange-400" },
                    { l: "Blue hr", t: "8:30pm", c: "bg-blue-500" },
                  ].map((x) => (
                    <div key={x.l} className="rounded-md border p-3">
                      <div className="text-xs text-muted-foreground">{x.l}</div>
                      <div className="font-semibold mt-0.5">{x.t}</div>
                      <div className={`h-1 mt-2 rounded-full ${x.c}`} />
                    </div>
                  ))}
                </div>
                <div className="mt-4 space-y-1.5 text-sm">
                  <div className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Wide establishing</div>
                  <div className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> 3/4 length</div>
                  <div className="flex items-center gap-2 text-muted-foreground"><span className="h-4 w-4 border rounded-sm" /> Hands / detail</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="bg-muted/40 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-3xl font-bold text-center">Everything you need before you hit the shutter</h2>
          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { I: Sun, t: "Golden Hour Calculator", d: "Type your location and date. Get exact golden hour, blue hour, sunrise and sunset times automatically." },
              { I: ListChecks, t: "Visual Shot Lists", d: "Build your shot list before the shoot. Tick off frames as you go. Track your progress in real time." },
              { I: LayoutTemplate, t: "Shoot Templates", d: "Start from a template: Nightclub, Sports, Portrait, Wedding or Street. Pre-filled mood tags and shot lists." },
              { I: CloudSun, t: "Weather Forecast", d: "See temperature, rain chance, cloud cover and wind for your exact shoot location and date." },
            ].map(({ I, t, d }) => (
              <div key={t} className="rounded-lg bg-card border shadow-card p-5">
                <div className="h-10 w-10 rounded-md bg-primary-soft text-primary flex items-center justify-center"><I className="h-5 w-5" /></div>
                <div className="mt-4 font-semibold">{t}</div>
                <div className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="py-20">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-3xl font-bold text-center">Simple pricing</h2>
          <p className="text-center text-muted-foreground mt-2">Start free. Upgrade when you need more.</p>
          <div className="mt-10 grid sm:grid-cols-2 gap-5">
            <PricingCard
              name="Free"
              price="£0"
              subtitle="forever"
              features={["Up to 3 shoots", "Shot list builder", "Golden hour times", "Weather forecast", "Basic planner"]}
              ctaLabel="Start free"
            />
            <PricingCard
              name="Pro"
              price="£6"
              subtitle="/month"
              highlight
              features={["Unlimited shoots", "All 5 shoot templates", "Client brief PDF export", "Gear bag memory", "Inspiration board", "Priority new features"]}
              ctaLabel="Get started"
            />
          </div>
          <div className="text-center mt-8">
            <Link to="/login" search={{ tab: "signup" } as any} className="inline-flex px-6 py-3 rounded-md bg-primary text-primary-foreground font-medium hover:opacity-90">Start free</Link>
          </div>
        </div>
      </section>

      <footer className="border-t py-8">
        <div className="mx-auto max-w-6xl px-6 flex flex-wrap items-center justify-between gap-4 text-sm text-muted-foreground">
          <div>© 2026 Shoot Brief</div>
          <div className="flex flex-wrap gap-5">
            <a href="/#pricing" className="hover:text-foreground">Pricing</a>
            <Link to="/terms" className="hover:text-foreground">Terms of use</Link>
            <Link to="/privacy" className="hover:text-foreground">Privacy policy</Link>
            <Link to="/login" search={{ tab: "signin" } as any} className="hover:text-foreground">Log in</Link>
            <Link to="/login" search={{ tab: "signup" } as any} className="hover:text-foreground">Sign up</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function PricingCard({ name, price, subtitle, features, highlight, ctaLabel }: { name: string; price: string; subtitle: string; features: string[]; highlight?: boolean; ctaLabel: string }) {
  return (
    <div className={`rounded-lg bg-card p-6 shadow-card relative flex flex-col ${highlight ? "border-2 border-primary" : "border"}`}>
      {highlight && <span className="absolute -top-3 right-6 px-2 py-1 text-xs font-medium rounded-md bg-primary text-primary-foreground">Most popular</span>}
      <div className="text-lg font-semibold">{name}</div>
      <div className="mt-3 flex items-baseline gap-1">
        <span className="text-4xl font-bold">{price}</span>
        <span className="text-muted-foreground">{subtitle}</span>
      </div>
      <ul className="mt-6 space-y-2.5 text-sm flex-1">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2"><Check className="h-4 w-4 text-primary mt-0.5 shrink-0" /> {f}</li>
        ))}
      </ul>
      <Link
        to="/login"
        search={{ tab: "signup" } as any}
        className={`mt-6 inline-flex items-center justify-center px-4 py-2.5 rounded-md text-sm font-medium ${
          highlight
            ? "bg-primary text-primary-foreground hover:opacity-90"
            : "border border-border bg-background hover:bg-muted"
        }`}
      >
        {ctaLabel}
      </Link>
    </div>
  );
}
