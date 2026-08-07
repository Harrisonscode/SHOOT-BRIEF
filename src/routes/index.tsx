import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Logo } from "@/components/Logo";
import {
  Sun, ListChecks, LayoutTemplate, CloudSun, Check, Menu, X,
  Calendar, Star, Inbox, Package, Link2, Repeat, Receipt, Mail,
} from "lucide-react";
import { TYPE_COLORS } from "@/lib/shoot";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Shoot Brief — The all-in-one tool for professional photographers" },
      { name: "description", content: "Plan shoots, manage clients, take bookings, and deliver a stunning client experience. Built for working photographers." },
      { property: "og:title", content: "Shoot Brief" },
      { property: "og:description", content: "The all-in-one tool for professional photographers." },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" },
    ],
  }),
  component: Landing,
});

// ─── Signature element data: shoot cards, styled exactly like the dashboard ──
type MarqueeShoot = {
  name: string;
  date: string;
  location: string;
  type: keyof typeof TYPE_COLORS;
  editingPct: number | null;
  shotsDone: number;
  shotsTotal: number;
};

const SHOOTS: MarqueeShoot[] = [
  { name: "Olivia & Tom", date: "Sat 15 Aug", location: "The Orangery, Bristol", type: "Wedding", editingPct: 55, shotsDone: 8, shotsTotal: 14 },
  { name: "County Rugby Final", date: "Sun 9 Aug", location: "Twickenham", type: "Sports", editingPct: null, shotsDone: 0, shotsTotal: 10 },
  { name: "Reload Fridays", date: "Fri 14 Aug", location: "Leeds", type: "Nightclub", editingPct: 15, shotsDone: 2, shotsTotal: 9 },
  { name: "Headshots — Maya R.", date: "Tue 11 Aug", location: "Home Studio", type: "Portrait", editingPct: 80, shotsDone: 6, shotsTotal: 6 },
  { name: "Camden Market Series", date: "Wed 12 Aug", location: "Camden, London", type: "Street", editingPct: null, shotsDone: 0, shotsTotal: 12 },
  { name: "Grace & Daniel", date: "Sat 22 Aug", location: "Thornbury Castle", type: "Wedding", editingPct: 30, shotsDone: 5, shotsTotal: 16 },
  { name: "Basketball Society Semis", date: "Thu 13 Aug", location: "Bath Sports Centre", type: "Sports", editingPct: 60, shotsDone: 9, shotsTotal: 12 },
  { name: "Warehouse 22", date: "Sat 15 Aug", location: "Manchester", type: "Nightclub", editingPct: null, shotsDone: 0, shotsTotal: 8 },
  { name: "Founders — Nova Labs", date: "Mon 10 Aug", location: "Shoreditch Studio", type: "Portrait", editingPct: 45, shotsDone: 4, shotsTotal: 8 },
  { name: "Rainy Night Reflections", date: "Fri 7 Aug", location: "Liverpool", type: "Street", editingPct: 90, shotsDone: 9, shotsTotal: 10 },
  { name: "Chloe & Ben", date: "Sat 29 Aug", location: "Pennard House", type: "Wedding", editingPct: null, shotsDone: 0, shotsTotal: 18 },
  { name: "5-a-side League Final", date: "Sun 16 Aug", location: "Reading", type: "Sports", editingPct: 25, shotsDone: 3, shotsTotal: 10 },
  { name: "Neon Nights", date: "Fri 21 Aug", location: "Bristol", type: "Nightclub", editingPct: 10, shotsDone: 1, shotsTotal: 9 },
  { name: "Portfolio — James K.", date: "Wed 19 Aug", location: "Studio 3", type: "Portrait", editingPct: 70, shotsDone: 5, shotsTotal: 7 },
  { name: "Market Day Candids", date: "Sat 8 Aug", location: "Borough Market", type: "Street", editingPct: 5, shotsDone: 1, shotsTotal: 11 },
];

const ROWS = [
  { items: SHOOTS.slice(0, 5), duration: 46, reverse: false },
  { items: SHOOTS.slice(5, 10), duration: 58, reverse: true },
  { items: SHOOTS.slice(10, 15), duration: 70, reverse: false },
];

function ShootCard({ s }: { s: MarqueeShoot }) {
  const c = TYPE_COLORS[s.type] ?? TYPE_COLORS.Custom;
  const pct = Math.round((s.shotsDone / s.shotsTotal) * 100) || 0;
  return (
    <div className="w-[260px] shrink-0 mx-2 rounded-lg border bg-card shadow-card p-4">
      <div className="font-semibold text-base leading-tight truncate">{s.name}</div>
      <div className="mt-1 text-sm text-muted-foreground truncate">{s.date} · {s.location}</div>
      <div className="mt-3 flex items-center gap-2 flex-wrap">
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium ${c.bg} ${c.text}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />{s.type}
        </span>
        {s.editingPct != null && (
          <span className="text-xs px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
            Editing {s.editingPct}%
          </span>
        )}
      </div>
      <div className="mt-3">
        <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
          <span>{s.shotsDone} of {s.shotsTotal} shots</span><span>{pct}%</span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}

function ShootMarquee() {
  return (
    <div className="marquee-bleed py-1">
      <div className="flex flex-col gap-4">
        {ROWS.map((row, i) => (
          <div key={i} className="marquee-row">
            <div
              className={`marquee-track ${row.reverse ? "marquee-reverse" : ""}`}
              style={{ ["--marquee-duration" as any]: `${row.duration}s` }}
            >
              {[...row.items, ...row.items].map((s, j) => (
                <ShootCard key={`${i}-${j}`} s={s} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Feature copy ────────────────────────────────────────────────────────────
const FEATURES_A = [
  { icon: Sun, title: "Golden Hour & Weather", desc: "Automatic golden hour, blue hour, sunrise and sunset for any location, plus a live forecast so you're never caught off guard." },
  { icon: ListChecks, title: "Shot Lists & Templates", desc: "Build visual shot lists before the shoot. Tick off frames as you go, starting from Wedding, Sports, Nightclub or Portrait templates." },
  { icon: Inbox, title: "Booking Requests", desc: "Your own public booking page. Clients fill in a form, you get notified, and accept or decline with one click." },
  { icon: Link2, title: "Client Portal", desc: "A shareable link per shoot showing timeline, editing progress and gallery link. No login needed on their side." },
  { icon: Package, title: "Packages & Pricing", desc: "Create shoot packages with pricing and deliverables. Clients pick one straight from your booking page." },
  { icon: Star, title: "Client Reviews", desc: "After delivery, clients leave a star rating from their portal. You choose which ones show on your booking page." },
];

const FEATURES_B = [
  { icon: Calendar, title: "Calendar Sync", desc: "Subscribe to your shoots in Google, Apple or Outlook calendar — updates automatically as shoots change." },
  { icon: Receipt, title: "Expense Tracking", desc: "Log travel, equipment hire and other costs per shoot. See your running total and actual margin." },
  { icon: Repeat, title: "Recurring Shoots", desc: "Set a shoot to repeat weekly, monthly or on a custom interval, with shot lists carried over automatically." },
  { icon: CloudSun, title: "Inspiration Board", desc: "Save reference images from anywhere. Organise into named galleries and link them to specific shoots." },
  { icon: LayoutTemplate, title: "Gear Checklist", desc: "Build a gear list per shoot and tick off as you pack. Never leave a lens at home again." },
  { icon: Mail, title: "Automatic Emails", desc: "Shoot Brief emails clients at the right moment on its own — booking confirmed, contract ready to sign, invoice due, gallery delivered — so you're never the one chasing." },
];

const FREE_FEATURES = [
  "Up to 3 shoots",
  "Shot list builder",
  "Golden hour times",
  "Weather forecast",
  "Booking page",
  "Basic planner",
];

const PRO_FEATURES = [
  "Unlimited shoots",
  "Client portal with live tracking",
  "Booking requests & notifications",
  "Packages & pricing",
  "Client reviews on your booking page",
  "Contracts with digital client signing",
  "Professional invoicing & payment tracking",
  "Custom branding (logo, colours, business details)",
  "Calendar sync (Google, Apple, Outlook)",
  "Expense tracking per shoot",
  "Recurring shoot series",
  "Inspiration board",
  "All 5 shoot templates",
  "Automatic client emails",
];

function Landing() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Nav */}
      <header className="border-b relative">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <Logo />
          <div className="hidden md:flex items-center gap-2">
            <a href="#features" className="px-3 py-2 text-sm font-medium hover:text-primary">Features</a>
            <a href="#pricing" className="px-3 py-2 text-sm font-medium hover:text-primary">Pricing</a>
            <Link to="/login" search={{ tab: "signin" } as any} className="px-3 py-2 text-sm font-medium hover:text-primary">Log in</Link>
            <Link to="/login" search={{ tab: "signup" } as any} className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
              Start free
            </Link>
          </div>
          <button onClick={() => setMenuOpen((v) => !v)} className="md:hidden p-2 text-primary" aria-label="Menu">
            {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
        {menuOpen && (
          <div className="md:hidden absolute top-full inset-x-0 bg-background border-b shadow-card z-40">
            <div className="px-6 py-3 flex flex-col gap-1">
              <a href="#features" onClick={() => setMenuOpen(false)} className="py-3 text-sm font-medium hover:text-primary">Features</a>
              <a href="#pricing" onClick={() => setMenuOpen(false)} className="py-3 text-sm font-medium hover:text-primary">Pricing</a>
              <Link to="/login" search={{ tab: "signin" } as any} onClick={() => setMenuOpen(false)} className="py-3 text-sm font-medium hover:text-primary">Log in</Link>
              <Link to="/login" search={{ tab: "signup" } as any} onClick={() => setMenuOpen(false)} className="py-3 text-sm font-medium text-primary">Start free</Link>
            </div>
          </div>
        )}
      </header>

      {/* Hero */}
      <section className="pt-16 pb-4 sm:pt-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex items-center gap-2 text-xs font-exif uppercase tracking-[0.2em] text-primary mb-5">
            <span className="h-1.5 w-1.5 bg-primary" />
            Built for working photographers
          </div>
          <h1 className="font-display text-5xl sm:text-6xl font-semibold tracking-tight leading-[1.05] max-w-2xl">
            The tool your photography business actually needs.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            Plan shoots, manage clients, take bookings, track expenses and deliver a professional client experience — all in one place.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/login" search={{ tab: "signup" } as any} className="px-6 py-3 rounded-md bg-primary text-primary-foreground font-medium hover:opacity-90 text-sm">
              Start free — no card needed
            </Link>
            <a href="#features" className="px-6 py-3 rounded-md border border-border bg-background font-medium hover:bg-muted text-sm">
              See all features
            </a>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">Free plan available · Pro from £6/month · Cancel anytime</p>
        </div>

        {/* Signature: continuously drifting shoot frames, film-contact-sheet style */}
        <div className="mt-14">
          <ShootMarquee />
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex items-baseline justify-between gap-4 flex-wrap">
            <h2 className="font-display text-3xl font-semibold">Everything in one place</h2>
            <p className="text-sm text-muted-foreground max-w-sm">
              From the moment a client enquires to the final gallery delivery — Shoot Brief handles the whole workflow.
            </p>
          </div>
          <div className="mt-12 grid md:grid-cols-2 gap-x-12">
            <div className="divide-y divide-border">
              {FEATURES_A.map(({ icon: Icon, title, desc }) => (
                <div key={title} className="py-5 flex gap-4 first:pt-0">
                  <Icon className="h-5 w-5 text-primary shrink-0 mt-0.5" strokeWidth={1.75} />
                  <div>
                    <div className="font-semibold">{title}</div>
                    <div className="mt-1 text-sm text-muted-foreground leading-relaxed">{desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="divide-y divide-border">
              {FEATURES_B.map(({ icon: Icon, title, desc }) => (
                <div key={title} className="py-5 flex gap-4 first:pt-0 md:first:pt-5">
                  <Icon className="h-5 w-5 text-primary shrink-0 mt-0.5" strokeWidth={1.75} />
                  <div>
                    <div className="font-semibold">{title}</div>
                    <div className="mt-1 text-sm text-muted-foreground leading-relaxed">{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Client portal highlight */}
      <section className="bg-muted/40 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="text-xs font-exif font-semibold text-primary uppercase tracking-wide mb-3">Client Experience</div>
              <h2 className="font-display text-3xl font-semibold">Your clients deserve better than a text update</h2>
              <p className="mt-4 text-muted-foreground leading-relaxed">
                Send clients a link to their own portal. They can see their shoot date, editing progress, gallery link, contract and payment status — without logging in or downloading anything.
              </p>
              <ul className="mt-6 space-y-3 text-sm">
                {[
                  "Live editing progress bar",
                  "Visual timeline: Shoot → Editing → Delivery",
                  "Gallery link button",
                  "Your contact details",
                  "Star rating and review after delivery",
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              <Link to="/login" search={{ tab: "signup" } as any} className="mt-8 inline-flex px-5 py-2.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
                Try it free
              </Link>
            </div>
            <div className="rounded-lg border bg-white shadow-card overflow-hidden">
              <div className="bg-[#1a1a1a] px-4 py-3 flex items-center gap-2 text-xs text-white/60">
                <span className="text-white font-medium">📷 Shoot Brief</span>
                <span className="ml-auto">shootbrief.app/client/...</span>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <div className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">Hi Sarah 👋</div>
                  <div className="font-bold text-xl text-gray-900">Wedding — Sarah & James</div>
                  <div className="text-gray-500 text-sm mt-0.5">Sat 12 July · The Grand Hotel</div>
                </div>
                <div className="rounded-xl border p-4 space-y-3">
                  <div className="text-xs font-semibold text-gray-400 uppercase">Timeline</div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex flex-col items-center gap-1">
                      <div className="h-8 w-8 rounded-full bg-[#4f8a1f] flex items-center justify-center text-white text-xs">✓</div>
                      <span className="text-[#4f8a1f] text-xs font-semibold">Shoot day</span>
                    </div>
                    <div className="flex-1 h-0.5 bg-[#4f8a1f] mx-2" />
                    <div className="flex flex-col items-center gap-1">
                      <div className="h-8 w-8 rounded-full border-2 border-[#4f8a1f] bg-white flex items-center justify-center text-xs ring-4 ring-[#4f8a1f]/20">✏️</div>
                      <span className="text-[#4f8a1f] text-xs font-semibold">Editing</span>
                    </div>
                    <div className="flex-1 h-0.5 bg-gray-200 mx-2" />
                    <div className="flex flex-col items-center gap-1">
                      <div className="h-8 w-8 rounded-full border-2 border-gray-200 bg-white flex items-center justify-center text-xs">🎉</div>
                      <span className="text-gray-400 text-xs">Delivery</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs text-gray-400 mb-1"><span>Editing progress</span><span className="text-[#4f8a1f] font-semibold">65%</span></div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-[#4f8a1f] rounded-full" style={{ width: "65%" }} />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg border p-3 border-[#4f8a1f]/30">
                    <div className="text-xs text-gray-400">Contract</div>
                    <div className="text-sm font-semibold text-[#4f8a1f]">Signed ✓</div>
                  </div>
                  <div className="rounded-lg border p-3 border-amber-200">
                    <div className="text-xs text-gray-400">Payment</div>
                    <div className="text-sm font-semibold text-amber-600">Deposit paid</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="font-display text-3xl font-semibold text-center">Simple pricing</h2>
          <p className="text-center text-muted-foreground mt-2">Start free. Upgrade when you need more.</p>
          <div className="mt-10 grid sm:grid-cols-2 gap-5">
            <PricingCard
              name="Free"
              price="£0"
              subtitle="forever"
              features={FREE_FEATURES}
              ctaLabel="Start free"
            />
            <PricingCard
              name="Pro"
              price="£6"
              subtitle="/month"
              highlight
              features={PRO_FEATURES}
              ctaLabel="Get started"
            />
          </div>
          <p className="text-center text-sm text-muted-foreground mt-6">No contracts. Cancel anytime. Instant access after upgrade.</p>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#1a1a1a] py-20">
        <div className="mx-auto max-w-2xl px-6 text-center">
          <h2 className="font-display text-3xl font-semibold text-white">Ready to run your photography business properly?</h2>
          <p className="mt-4 text-white/60">Join photographers using Shoot Brief to plan better, impress clients and stay on top of their business.</p>
          <Link to="/login" search={{ tab: "signup" } as any} className="mt-8 inline-flex px-6 py-3 rounded-md bg-primary text-primary-foreground font-medium hover:opacity-90">
            Start free — no card needed
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="mx-auto max-w-6xl px-6 flex flex-wrap items-center justify-between gap-4 text-sm text-muted-foreground">
          <div>© 2026 Shoot Brief</div>
          <div className="flex flex-wrap gap-5">
            <a href="#features" className="hover:text-foreground">Features</a>
            <a href="#pricing" className="hover:text-foreground">Pricing</a>
            <Link to="/terms" className="hover:text-foreground">Terms</Link>
            <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
            <Link to="/login" search={{ tab: "signin" } as any} className="hover:text-foreground">Log in</Link>
            <Link to="/login" search={{ tab: "signup" } as any} className="hover:text-foreground">Sign up</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function PricingCard({ name, price, subtitle, features, highlight, ctaLabel }: {
  name: string; price: string; subtitle: string; features: string[]; highlight?: boolean; ctaLabel: string;
}) {
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
          <li key={f} className="flex items-start gap-2">
            <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" /> {f}
          </li>
        ))}
      </ul>
      <Link
        to="/login"
        search={{ tab: "signup" } as any}
        className={`mt-6 inline-flex items-center justify-center px-4 py-2.5 rounded-md text-sm font-medium ${
          highlight ? "bg-primary text-primary-foreground hover:opacity-90" : "border border-border bg-background hover:bg-muted"
        }`}
      >
        {ctaLabel}
      </Link>
    </div>
  );
}
