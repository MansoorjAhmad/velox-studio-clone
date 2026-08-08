"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FadeIn, Stagger, StaggerItem } from "@/components/ui/motion";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import {
  Sparkles,
  ArrowRight,
  Shield,
  BarChart3,
  Brain,
  Activity,
  Target,
  Zap,
  TrendingUp,
  Check,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden selection:bg-brand/30">
      {/* Navigation */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="h-9 w-9 rounded-lg bg-brand/10 border border-brand/20 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5 text-brand" />
            </div>
            <span className="font-bold tracking-tight text-lg">Velox Studio</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm text-foreground-muted font-medium">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#discipline" className="hover:text-foreground transition-colors">Trader Index</a>
            <a href="#zenith" className="hover:text-foreground transition-colors">Zenith AI</a>
            <a href="#access" className="hover:text-foreground transition-colors">Access</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/auth/login">
              <Button variant="ghost" size="sm" className="font-medium">Log in</Button>
            </Link>
            <Link href="/auth/sign-up">
              <Button size="sm" className="font-semibold shadow-md shadow-brand/20">
                Launch Workspace
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative pt-28 pb-32 overflow-hidden">

        <div className="relative max-w-4xl mx-auto px-6 text-center">
          <FadeIn delay={0.05}>
            <div className="inline-flex items-center gap-2 rounded-full border border-brand/25 bg-brand/8 px-3.5 py-1.5 text-xs font-semibold text-brand mb-8">
              {/* Fix #4: use a wrapper span for glow-pulse so box-shadow renders correctly */}
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-profit opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-profit" />
              </span>
              The trader's operating system
            </div>
          </FadeIn>

          <FadeIn delay={0.12}>
            <h1 className="text-display font-display mb-6">
              Trade with the discipline of an institution.
            </h1>
          </FadeIn>

          <FadeIn delay={0.2}>
            <p className="text-lg md:text-xl text-foreground-muted max-w-2xl mx-auto mb-10 leading-relaxed">
              One command center for your edge — trade journaling, performance analytics,
              a discipline score that catches your leaks before they cost you, and an AI
              that reads your trades and tells you the truth.
            </p>
          </FadeIn>

          <FadeIn delay={0.28}>
            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-16">
              <Link href="/auth/sign-up">
                <Button size="lg" className="w-full sm:w-auto font-bold px-8 shadow-sm">
                  Start free
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button size="lg" variant="outline" className="w-full sm:w-auto font-medium">
                  Explore the dashboard
                </Button>
              </Link>
            </div>
          </FadeIn>

          {/* Fix #5: trust metrics with a visual container */}
          <FadeIn delay={0.36} whenInView>
            <div className="inline-block w-full max-w-2xl mx-auto rounded-2xl border border-border/60 bg-surface/40 backdrop-blur-sm px-6 py-5">
              <div className="grid grid-cols-3 gap-4 divide-x divide-border/50">
                <TrustStat value={<><AnimatedCounter value={12} /> modules</>} label="One unified workspace" />
                <TrustStat value={<><AnimatedCounter value={100} />%</>} label="Free, no card required" />
                <TrustStat value="∞" label="Unlimited trades logged" />
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Features grid */}
      <section id="features" className="py-24 border-t border-border/50">
        <div className="max-w-6xl mx-auto px-6">
          <FadeIn whenInView>
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-h1 font-display mb-4">Everything a serious trader needs.</h2>
              <p className="text-foreground-muted text-base">
                Not a spreadsheet. Not a toy. A full operating system built around one idea:
                the disciplined trader wins.
              </p>
            </div>
          </FadeIn>

          {/* Fix #6: Stagger + StaggerItem for orchestrated card entrances */}
          <Stagger className="grid md:grid-cols-2 lg:grid-cols-3 gap-5" whenInView stagger={0.07}>
            <StaggerItem className="h-full">
              <FeatureCard
                icon={Shield}
                title="Trader Index"
                tag="New"
                description="A composite discipline score that detects revenge trades, oversized positions, and emotional patterns — before they blow your account."
              />
            </StaggerItem>
            <StaggerItem className="h-full">
              <FeatureCard
                icon={BarChart3}
                title="Performance Analytics"
                description="Zoomable equity curve, R-multiple distribution, drawdown recovery time, win-rate breakdowns by session, setup, symbol, and hour."
              />
            </StaggerItem>
            <StaggerItem className="h-full">
              <FeatureCard
                icon={Brain}
                title="Velox Zenith AI"
                tag="AI"
                description="Cross-trade pattern detection, weekly AI performance reviews, and a natural-language query box over your own trade history."
              />
            </StaggerItem>
            <StaggerItem className="h-full">
              <FeatureCard
                icon={Activity}
                title="Backtest Replay"
                tag="New"
                description="Step through historical price data, log simulated trades, and test your edge — completely risk-free, with full analytics."
              />
            </StaggerItem>
            <StaggerItem className="h-full">
              <FeatureCard
                icon={Target}
                title="Risk Calculator"
                description="Instant position sizing for Gold, Forex, Indices, and Crypto. Standard and Cent account support with multi-TP logic."
              />
            </StaggerItem>
            <StaggerItem className="h-full">
              <FeatureCard
                icon={Zap}
                title="Finance & Goals OS"
                description="Debt payoff engine, goals tracking, daily routines, and tasks — because trading discipline extends beyond the charts."
              />
            </StaggerItem>
          </Stagger>
        </div>
      </section>

      {/* Trader Index spotlight */}
      <section id="discipline" className="py-24 border-t border-border/50 bg-surface/30">
        <div className="max-w-5xl mx-auto px-6">
          {/* Fix #1: use .glass on the hero spotlight panel */}
          <div className="rounded-2xl border border-border glass p-8 md:p-12 relative overflow-hidden">

            <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <FadeIn direction="right" className="lg:col-span-7 space-y-5" whenInView>
                <div className="inline-flex items-center gap-1.5 rounded-full border border-brand/30 bg-brand/10 px-2.5 py-1 text-[11px] font-semibold text-brand">
                  <Shield className="w-3 h-3" />
                  Trader Index
                </div>
                <h2 className="text-h2 font-display">A discipline score, not just a profit score.</h2>
                <p className="text-foreground-muted text-sm md:text-base leading-relaxed">
                  Profitable-but-reckless never lasts. The Trader Index measures four pillars
                  of discipline — risk consistency, rule adherence, emotional control, and
                  revenge-trade detection — and flags violations in real time.
                </p>
                <ul className="space-y-2 text-sm text-foreground">
                  {[
                    "Detects oversized positions within 60 min of a loss",
                    "Flags missing stop-losses and daily risk-cap breaches",
                    "Compares win rate under calm vs reactive emotional states",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-profit shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </FadeIn>

              <FadeIn direction="left" className="lg:col-span-5" whenInView>
                <div className="rounded-xl border border-brand/30 bg-surface/90 p-5 shadow-xl space-y-4">
                  <div className="flex items-center justify-between border-b border-border/60 pb-3">
                    <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-brand" /> Trader Index
                    </span>
                    <span className="text-[10px] font-semibold text-profit">Elite Discipline</span>
                  </div>
                  <div className="flex items-center justify-center py-2">
                    <div className="relative w-32 h-32">
                      <div className="absolute inset-0 rounded-full" style={{ background: "conic-gradient(#34d399 0deg 297deg, #1c1c21 297deg 360deg)" }} />
                      <div className="absolute inset-[14px] rounded-full bg-surface flex items-center justify-center">
                        <div className="text-center">
                          <span className="text-3xl font-extrabold font-mono tabular text-profit">82</span>
                          <span className="text-[9px] text-foreground-subtle block mt-0.5">Grade A</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2 text-[11px]">
                    {[
                      { label: "Risk Consistency", val: 88, color: "bg-brand" },
                      { label: "Rule Adherence", val: 76, color: "bg-profit" },
                      { label: "Emotional Control", val: 84, color: "bg-info" },
                    ].map((s) => (
                      <div key={s.label}>
                        <div className="flex justify-between">
                          <span className="text-foreground-subtle">{s.label}</span>
                          <span className="font-mono font-bold">{s.val}</span>
                        </div>
                        <div className="h-1 rounded-full bg-surface-3 overflow-hidden mt-1">
                          <div className={`h-full ${s.color} rounded-full`} style={{ width: `${s.val}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </FadeIn>
            </div>
          </div>
        </div>
      </section>

      {/* Zenith AI section */}
      <section id="zenith" className="py-24 border-t border-border/50">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <FadeIn whenInView>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-brand/30 bg-brand/10 px-2.5 py-1 text-[11px] font-semibold text-brand mb-6">
              <Sparkles className="w-3 h-3" />
              Velox Zenith AI
            </div>
            <h2 className="text-h1 font-display mb-5">Your trades, read by an AI that doesn't lie.</h2>
            <p className="text-foreground-muted text-base max-w-2xl mx-auto mb-12 leading-relaxed">
              Zenith detects the patterns you can't see manually — "you lose 67% of trades
              after two consecutive losses" — narrates a weekly performance review, and
              answers your questions in plain English from your own data.
            </p>
          </FadeIn>

          {/* Fix #3: .card-hover on Zenith mini-cards + icon animation */}
          <Stagger className="grid md:grid-cols-3 gap-4 text-left" whenInView stagger={0.08}>
            {[
              { icon: TrendingUp, title: "Pattern Detection", desc: "10+ cross-trade patterns computed locally — no API key needed." },
              { icon: Brain, title: "Weekly Reviews", desc: "AI-narrated strengths, leaks, and next-week focus rules." },
              { icon: Zap, title: "Ask Anything", desc: "Natural-language queries answered from your trade history." },
            ].map((f) => (
              <StaggerItem key={f.title}>
                <div className="group rounded-xl border border-border bg-surface p-5 card-hover h-full">
                  <div className="w-9 h-9 rounded-lg bg-brand/10 border border-brand/20 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-200">
                    <f.icon className="w-4 h-4 text-brand" />
                  </div>
                  <h3 className="font-bold text-sm mb-1.5">{f.title}</h3>
                  <p className="text-xs text-foreground-muted leading-relaxed">{f.desc}</p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* CTA / Access */}
      <section id="access" className="py-24 border-t border-border/50">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <FadeIn whenInView>
            <h2 className="text-h1 font-display mb-4">Built for traders who want to last.</h2>
            <p className="text-foreground-muted mb-10 max-w-lg mx-auto">
              Every feature, every module, unlimited trades. No credit card, no paywall,
              no nonsense.
            </p>

            <Link href="/auth/sign-up">
              <Button size="lg" className="font-bold px-10 shadow-sm">
                Launch your workspace
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
            <p className="text-xs text-foreground-subtle mt-4">
              Free forever · Your data stays yours · Supabase-secured
            </p>
          </FadeIn>
        </div>
      </section>

      {/* Fix #7: Expanded footer with nav links and CTA */}
      <footer className="border-t border-border bg-surface/30">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
            {/* Brand col */}
            <div className="md:col-span-1 space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-brand/10 border border-brand/20 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-brand" />
                </div>
                <span className="font-bold text-foreground">Velox Studio</span>
              </div>
              <p className="text-xs text-foreground-subtle leading-relaxed max-w-[200px]">
                A full trading operating system for disciplined traders.
              </p>
            </div>

            {/* Product links */}
            <div className="space-y-3">
              <p className="text-label text-foreground-subtle">Product</p>
              <ul className="space-y-2 text-sm text-foreground-muted">
                <li><a href="#features" className="hover:text-foreground transition-colors">Features</a></li>
                <li><a href="#discipline" className="hover:text-foreground transition-colors">Trader Index</a></li>
                <li><a href="#zenith" className="hover:text-foreground transition-colors">Zenith AI</a></li>
                <li><Link href="/dashboard/backtest" className="hover:text-foreground transition-colors">Backtest Replay</Link></li>
              </ul>
            </div>

            {/* App links */}
            <div className="space-y-3">
              <p className="text-label text-foreground-subtle">Dashboard</p>
              <ul className="space-y-2 text-sm text-foreground-muted">
                <li><Link href="/dashboard" className="hover:text-foreground transition-colors">Overview</Link></li>
                <li><Link href="/dashboard/journal" className="hover:text-foreground transition-colors">Trade Journal</Link></li>
                <li><Link href="/dashboard/analytics" className="hover:text-foreground transition-colors">Analytics</Link></li>
                <li><Link href="/dashboard/calculator" className="hover:text-foreground transition-colors">Risk Calculator</Link></li>
              </ul>
            </div>

            {/* CTA col */}
            <div className="space-y-3">
              <p className="text-label text-foreground-subtle">Get Started</p>
              <p className="text-xs text-foreground-muted leading-relaxed">
                Free forever. No card required. Log your first trade in under 60 seconds.
              </p>
              <Link href="/auth/sign-up">
                <Button size="sm" className="w-full font-semibold shadow-sm shadow-brand/20">
                  Launch Workspace
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="border-t border-border/60 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-xs text-foreground-subtle">
              © {new Date().getFullYear()} Velox Studio. All rights reserved.
            </span>
            <div className="flex items-center gap-1.5 text-xs text-foreground-subtle">
              <Shield className="w-3.5 h-3.5 text-brand" />
              <span>Trade with discipline. Or don't trade at all.</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
//  Sub-components
// ────────────────────────────────────────────────────────────────

function TrustStat({ value, label }: { value: React.ReactNode; label: string }) {
  return (
    <div className="text-center px-4">
      <div className="text-2xl font-bold font-mono tabular text-foreground">{value}</div>
      <div className="text-xs text-foreground-subtle mt-1">{label}</div>
    </div>
  );
}

// Fix #2: .card-hover replaces the manual hover classes; icon scales on group-hover
function FeatureCard({
  icon: Icon,
  title,
  description,
  tag,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  tag?: string;
}) {
  return (
    <div className="group relative rounded-xl border border-border bg-surface p-6 card-hover h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="w-10 h-10 rounded-lg bg-brand/10 border border-brand/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
          <Icon className="w-5 h-5 text-brand" />
        </div>
        {tag && (
          <span className="text-[10px] font-bold uppercase tracking-wider text-brand bg-brand/10 px-2 py-0.5 rounded-full border border-brand/20">
            {tag}
          </span>
        )}
      </div>
      <h3 className="font-bold text-lg mb-2 text-foreground">{title}</h3>
      <p className="text-sm text-foreground-muted leading-relaxed">{description}</p>
    </div>
  );
}
