import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Logo } from "@/components/Logo";
import {
  Sun, ListChecks, LayoutTemplate, CloudSun, Check, Menu, X,
  Calendar, Star, Inbox, Package, Link2, Repeat, Receipt
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Shoot Brief — The all-in-one tool for professional photographers" },
      { name: "description", content: "Plan shoots, manage clients, take bookings, and deliver a stunning client experience. Built for working photographers." },
      { property: "og:title", content: "Shoot Brief" },
      { property: "og:description", content: "The all-in-one tool for professional photographers." },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  {
    icon: Sun,
    title: "Golden Hour & Weather",
    desc: "Automatic golden hour, blue hour, sunrise and sunset times for any location. Live weather forecast so you're never caught off guard.",
  },
  {
    icon: ListChecks,
    title: "Shot Lists & Templates",
    desc: "Build visual shot lists before the shoot. Tick off frames as you go. Start from a template — Wedding, Sports, Nightclub, Portrait and more.",
  },
  {
    icon: Inbox,
    title: "Booking Requests",
    desc: "Your own public booking page. Clients fill in a form, you get an email notification, accept or decline with one click.",
  },
  {
    icon: Link2,
    title: "Client Portal",
    desc: "A shareable link per shoot showing your client their timeline, editing progress, gallery link, and your contact details. No login needed.",
  },
  {
    icon: Package,
    title: "Packages & Pricing",
    desc: "Create shoot packages with pricing and deliverables. Clients can pick a package when they book. Shown on your booking page.",
  },
  {
    icon: Star,
    title: "Client Reviews",
    desc: "After delivery clients leave a star rating from their portal. You approve the ones you want shown on your booking page.",
  },
  {
    icon: Calendar,
    title: "Calendar Sync",
    desc: "Subscribe to your shoots in Google Calendar, Apple Calendar or Outlook. Updates automatically when you add or change shoots.",
  },
  {
    icon: Receipt,
    title: "Expense Tracking",
    desc: "Log travel, equipment hire and other costs per shoot. See your running total and actual margin.",
  },
  {
    icon: Repeat,
    title: "Recurring Shoots",
    desc: "Set any shoot to repeat weekly, monthly or on a custom interval. Creates the full series in one go with shot lists carried over.",
  },
  {
    icon: CloudSun,
    title: "Inspiration Board",
    desc: "Save reference images from anywhere — upload or paste a URL. Organise into named galleries and link to specific shoots.",
  },
  {
    icon: LayoutTemplate,
    title: "Gear Checklist",
    desc: "Build a gear list per shoot. Tick off as you pack. Never leave a lens at home again.",
  },
  {
    icon: ListChecks,
    title: "Shoot Packages",
    desc: "Full PDF brief export for yourself. Shareable client report with a visual timeline showing shoot date, editing progress, and delivery.",
  },
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
  "Calendar sync (Google, Apple, Outlook)",
  "Expense tracking per shoot",
  "Recurring shoot series",
  "Inspiration board",
  "All 5 shoot templates",
  "PDF shoot brief export",
];

function Landing() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground">
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
      <section className="mx-auto max-w-6xl px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border bg-card text-xs font-medium text-muted-foreground mb-6">
          📷 Built for working photographers
        </div>
        <h1 className="text-5xl sm:text-6xl font-bold tracking-tight leading-[1.05]">
          The tool your photography<br />
          <span className="text-primary">business actually needs.</span>
        </h1>
        <p className="mt-6 max-w-2xl mx-auto text-lg text-muted-foreground">
          Plan shoots, manage clients, take bookings, track expenses and deliver a professional client experience — all in one place.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/login" search={{ tab: "signup" } as any} className="px-6 py-3 rounded-md bg-primary text-primary-foreground font-medium hover:opacity-90 text-sm">
            Start free — no card needed
          </Link>
          <a href="#features" className="px-6 py-3 rounded-md border border-border bg-background font-medium hover:bg-muted text-sm">
            See all features
          </a>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">Free plan available · Pro from £6/month · Cancel anytime</p>

        {/* App mockup */}
        <div className="mt-16 mx-auto max-w-4xl">
          <div className="rounded-xl border bg-card shadow-card overflow-hidden">
            <div className="bg-sidebar text-white px-4 py-3 flex items-center gap-2 text-xs">
              <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
              <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
              <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
              <span className="ml-2 opacity-60">shootbrief.app/planner</span>
            </div>
            <div className="grid grid-cols-12 min-h-[320px]">
              <div className="col-span-3 bg-sidebar text-white/80 p-4 text-xs space-y-2">
                <div className="opacity-70 text-[10px] uppercase tracking-wide mb-3">Shoot Brief</div>
                <div className="px-2 py-1.5 rounded">Dashboard</div>
                <div className="px-2 py-1.5 rounded border-l-2 border-primary bg-[color:var(--sidebar-active)] text-white">New Shoot</div>
                <div className="px-2 py-1.5 rounded">Calendar</div>
                <div className="px-2 py-1.5 rounded">Bookings</div>
                <div className="px-2 py-1.5 rounded">Reviews</div>
              </div>
              <div className="col-span-9 p-6 bg-background text-left">
                <div className="text-2xl font-semibold">Wedding — Sarah & James</div>
                <div className="text-sm text-muted-foreground mt-1">Sat 12 July · 10:00am · The Grand Hotel, Manchester</div>
                <div className="mt-4 flex gap-2 flex-wrap">
                  <span className="px-2 py-0.5 text-xs rounded-md bg-rose-100 text-rose-700 font-medium">Wedding</span>
                  <span className="px-2 py-0.5 text-xs rounded-md bg-green-100 text-green-700 font-medium">Contract signed ✓</span>
                  <span className="px-2 py-0.5 text-xs rounded-md bg-amber-100 text-amber-700 font-medium">Deposit paid</span>
                </div>
                <div className="mt-5 grid grid-cols-3 gap-3">
                  {[
                    { l: "Golden hr", t: "8:42pm", c: "bg-orange-400" },
                    { l: "Weather", t: "22°C ☀️", c: "bg-yellow-300" },
                    { l: "Editing", t: "0%", c: "bg-muted" },
                  ].map((x) => (
                    <div key={x.l} className="rounded-md border p-3">
                      <div className="text-xs text-muted-foreground">{x.l}</div>
                      <div className="font-semibold mt-0.5 text-sm">{x.t}</div>
                      <div className={`h-1 mt-2 rounded-full ${x.c}`} />
                    </div>
                  ))}
                </div>
                <div className="mt-4 space-y-1.5 text-sm">
                  <div className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Ceremony wide shots</div>
                  <div className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> First dance</div>
                  <div className="flex items-center gap-2 text-muted-foreground"><span className="h-4 w-4 border rounded-sm inline-block" /> Golden hour portraits</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social proof strip */}
      <div className="border-y bg-muted/40 py-8">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <p className="text-sm text-muted-foreground font-medium uppercase tracking-wide mb-4">Designed for every type of photographer</p>
          <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
            {["Wedding", "Portrait", "Sports", "Commercial", "Nightlife", "Events", "Fashion", "Real Estate"].map((t) => (
              <span key={t} className="px-3 py-1.5 rounded-full border bg-background">{t}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Features */}
      <section id="features" className="py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-3xl font-bold text-center">Everything in one place</h2>
          <p className="text-center text-muted-foreground mt-2 max-w-xl mx-auto">
            From the moment a client enquires to the final gallery delivery — Shoot Brief handles the whole workflow.
          </p>
          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="rounded-lg bg-card border shadow-card p-5">
                <div className="h-10 w-10 rounded-md bg-primary-soft text-primary flex items-center justify-center">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="mt-4 font-semibold">{title}</div>
                <div className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Client portal highlight */}
      <section className="bg-muted/40 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="text-xs font-semibold text-primary uppercase tracking-wide mb-3">Client Experience</div>
              <h2 className="text-3xl font-bold">Your clients deserve better than a text update</h2>
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
            <div className="rounded-2xl border bg-white shadow-card overflow-hidden">
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
          <h2 className="text-3xl font-bold text-center">Simple pricing</h2>
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
          <h2 className="text-3xl font-bold text-white">Ready to run your photography business properly?</h2>
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
