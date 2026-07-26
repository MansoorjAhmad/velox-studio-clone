import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PositionCalculator } from "@/components/calculator/position-calculator";
import {
  Sparkles,
  BookOpen,
  TrendingUp,
  DollarSign,
  Target,
  Brain,
  Clock,
  ArrowRight,
  Check,
  BarChart3,
  Shield,
  Zap,
  Calculator,
  Coins,
  Cpu,
  Layers,
  Lock,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden selection:bg-brand/30">
      {/* ───────────────────────────────────────────── NAV */}
      <header className="sticky top-0 z-50 border-b border-border/80 bg-background/85 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="h-9 w-9 rounded-lg bg-brand/10 border border-brand/20 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5 text-brand" />
            </div>
            <span className="font-bold tracking-tight text-lg">Velox Studio</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm text-foreground-muted font-medium">
            <a href="#calculator" className="hover:text-foreground transition-colors">Risk Calculator</a>
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#ai-zenith" className="hover:text-foreground transition-colors">Zenith AI</a>
            <a href="#why" className="hover:text-foreground transition-colors">Why Velox</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/auth/login">
              <Button variant="ghost" size="sm" className="font-medium">Log in</Button>
            </Link>
            <Link href="/auth/sign-up">
              <Button size="sm" className="bg-brand text-brand-foreground hover:bg-brand/90 font-semibold shadow-md shadow-brand/20">
                Get started free
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ───────────────────────────────────────────── HERO */}
      <section className="relative pt-20 pb-24 border-b border-border/60">
        <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-brand/15 blur-[140px] pointer-events-none rounded-full" />

        <div className="relative max-w-5xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-3.5 py-1 text-xs font-semibold text-brand mb-6 animate-fade-in">
            <Zap className="w-3.5 h-3.5" />
            <span>The Trader&apos;s Operating System — Built for Discipline</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.08] mb-6 animate-fade-in">
            Master your risk.
            <br />
            <span className="bg-gradient-to-r from-brand via-info to-profit bg-clip-text text-transparent">
              Execute like an institution.
            </span>
          </h1>

          <p className="text-lg md:text-xl text-foreground-muted max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-in">
            The complete workspace for serious Forex and Commodity traders. Precision <strong>Position Size Calculator</strong> with dual TP targets, Risk Meter, Cent &amp; Standard modes — plus <strong>Velox Zenith AI</strong> and a TradeZella-grade journal.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-16 animate-fade-in">
            <Link href="/auth/sign-up">
              <Button size="lg" className="w-full sm:w-auto bg-brand text-brand-foreground hover:bg-brand/90 font-bold px-8 shadow-lg shadow-brand/25 glow-brand">
                Launch Workspace Free
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
            <Link href="/demo">
              <Button size="lg" variant="outline" className="w-full sm:w-auto font-medium">
                Try Interactive Demo
              </Button>
            </Link>
          </div>

          {/* Quick highlight stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {[
              { stat: "Institutional Grade", label: "NAS100, Gold, & FX" },
              { stat: "Smart Risk Suite", label: "Dual TP + Risk Meter" },
              { stat: "Dual Account Modes", label: "Standard & Cent Support" },
              { stat: "Unlimited Access", label: "100% Free Lifetime" },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-xl border border-border/80 bg-surface-2/60 backdrop-blur-md p-4 animate-fade-in text-center"
              >
                <div className="text-lg font-bold text-foreground font-mono">{s.stat}</div>
                <div className="text-xs text-foreground-subtle mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────────────────────────────────────── LIVE CALCULATOR DEMO SHOWCASE */}
      <section id="calculator" className="py-20 border-b border-border/60 bg-surface/30">
        <div className="max-w-6xl mx-auto px-6 space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <Badge variant="brand" className="mb-2">Live Interactive Tool — No Sign Up</Badge>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
              Position Sizing &amp; Risk Calculator
            </h2>
            <p className="text-foreground-muted text-sm md:text-base">
              Enter your balance, risk %, and trade prices — get exact lot sizes instantly. Supports <strong>XAUUSD, EURUSD, GBPUSD, USDJPY, NAS100</strong>. Dual TP targets with runner lots, break-even SL helper, pip/price mode, and Standard vs Cent account toggle.
            </p>
          </div>

          <div className="mx-auto max-w-5xl">
            <PositionCalculator />
          </div>
        </div>
      </section>

      {/* ───────────────────────────────────────────── FEATURES GRID */}
      <section id="features" className="py-24 border-b border-border/60">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16 max-w-2xl mx-auto">
            <Badge variant="outline" className="mb-3">Complete Suite</Badge>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
              Built for the edge-obsessed trader.
            </h2>
            <p className="text-foreground-muted text-sm md:text-base">
              From calculating exact lot sizes to analyzing post-trade psychology — every tool is engineered to streamline your routine.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Calculator,
                title: "Position Risk Calculator",
                desc: "Precision lot sizing for XAUUSD, EURUSD, GBPUSD, USDJPY, and NAS100. Dual TP targets with runner lots, animated Risk Meter, break-even SL, pip/price toggle, lot rounding, and Standard vs Cent account modes.",
                tag: "NEW",
              },
              {
                icon: Cpu,
                title: "Velox Zenith AI Engine",
                desc: "Powered by proprietary Velox Zenith AI models. Automatically analyzes win rates, drawdown patterns, best sessions, and surfaces the #1 leak in your strategy.",
                tag: "AI",
              },
              {
                icon: BookOpen,
                title: "TradeZella-Grade Journal",
                desc: "Log setups, direction, entry/exit prices, MAE/MFE, emotions, and session tags. Comprehensive analytics with equity curves.",
              },
              {
                icon: DollarSign,
                title: "Personal Finance & Debt Engine",
                desc: "Track income streams, monthly expenses, and debt payoff strategies (Avalanche vs. Snowball) side-by-side with your trading P&L.",
              },
              {
                icon: Target,
                title: "Goal & Routine Manager",
                desc: "Set weekly and monthly targets across trading, health, and personal goals. Stay disciplined with interactive checklists.",
              },
              {
                icon: Lock,
                title: "Frictionless Username Auth",
                desc: "No clutter, no lengthy email verification. Pick a username and password to enter your trading workspace in under 5 seconds.",
              },
            ].map((f) => (
              <div
                key={f.title}
                className="group relative rounded-xl border border-border bg-surface p-6 hover:border-brand/50 hover:bg-surface-2 transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-lg bg-brand/10 border border-brand/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <f.icon className="w-5 h-5 text-brand" />
                    </div>
                    {f.tag && (
                      <Badge variant={f.tag === "AI" ? "info" : "brand"} className="text-[10px] font-bold">
                        {f.tag}
                      </Badge>
                    )}
                  </div>
                  <h3 className="font-bold text-lg mb-2 text-foreground">{f.title}</h3>
                  <p className="text-sm text-foreground-muted leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────────────────────────────────────── ZENITH AI FEATURE DEEP DIVE */}
      <section id="ai-zenith" className="py-20 border-b border-border/60 bg-surface/30">
        <div className="max-w-5xl mx-auto px-6">
          <div className="rounded-2xl border border-brand/30 bg-gradient-to-br from-brand/10 via-surface to-surface-2 p-8 md:p-12 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-brand/20 blur-[100px] pointer-events-none" />

            <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-7 space-y-5">
                <Badge variant="brand" className="mb-1">
                  <Sparkles className="w-3 h-3 mr-1" />
                  AI Trading Assistant
                </Badge>
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
                  Meet Velox Zenith AI
                </h2>
                <p className="text-foreground-muted text-sm md:text-base leading-relaxed">
                  Zenith connects directly to your trade log. It spots hidden patterns — such as over-trading during New York session, revenge trading after a loss, or taking trades below your optimal R:R ratio — and recommends exact adjustments.
                </p>
                <div className="space-y-2.5 text-xs text-foreground font-medium pt-2">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-profit shrink-0" />
                    <span>Detects setups with highest win rate & profit factor</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-profit shrink-0" />
                    <span>Monitors risk exposure and drawdown limits</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-profit shrink-0" />
                    <span>Uses Velox Zenith AI for deep quantitative reviews</span>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-5 rounded-xl border border-brand/30 bg-surface/90 p-5 space-y-3 shadow-xl">
                <div className="flex items-center justify-between border-b border-border/60 pb-3">
                  <div className="flex items-center gap-2">
                    <Brain className="w-4 h-4 text-brand" />
                    <span className="text-xs font-bold uppercase tracking-wider">Zenith AI Output</span>
                  </div>
                  <Badge variant="profit" className="text-[10px]">94% Accuracy</Badge>
                </div>
                <div className="text-xs text-foreground-muted space-y-2 font-mono">
                  <p className="text-profit font-bold">✓ Edge Identified: XAUUSD Breakout (71% Win Rate)</p>
                  <p className="text-amber-400">⚠ Leak Detected: Reversal trades during London session (-$420 P&L)</p>
                  <p className="text-foreground font-semibold">💡 Rule: Limit risk to 1.0% per trade and cut Reversals.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────────────────────────────────── WHY VELOX */}
      <section id="why" className="py-24 border-b border-border/60">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-16 max-w-xl mx-auto">
            <Badge variant="outline" className="mb-3">Why Velox</Badge>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
              Built by traders, for traders.
            </h2>
          </div>

          <div className="space-y-4">
            {[
              {
                title: "100% Free & Unlimited",
                desc: "No subscriptions, no hidden limits. Journal as many trades as you want, calculate position sizes anytime, and access full analytics.",
              },
              {
                title: "Standard & Cent Account Precision",
                desc: "First platform built specifically with Cent Account (USC) lot sizing support so you never over-leverage micro accounts.",
              },
              {
                title: "Complete Financial Control",
                desc: "Connect your trading performance with your real-world finances, debt payoff goals, and daily time tracking.",
              },
              {
                title: "Your Data Stays Yours",
                desc: "Export your entire trading history to CSV or JSON anytime. Zero lock-in.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="flex gap-4 rounded-xl border border-border bg-surface p-5 hover:border-brand/40 transition-colors"
              >
                <div className="shrink-0 w-7 h-7 rounded-full bg-profit/15 flex items-center justify-center mt-0.5">
                  <Check className="w-4 h-4 text-profit" />
                </div>
                <div>
                  <h3 className="font-bold text-base mb-1 text-foreground">{item.title}</h3>
                  <p className="text-sm text-foreground-muted leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────────────────────────────────────── PRICING */}
      <section id="pricing" className="py-24">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <Badge variant="brand" className="mb-3">Pricing</Badge>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
            100% Free. Forever.
          </h2>
          <p className="text-foreground-muted mb-10 max-w-lg mx-auto">
            No trial periods, no hidden fees, no credit card required. Pick a username and start trading with institutional discipline.
          </p>

          <div className="rounded-2xl border-2 border-brand bg-surface p-8 md:p-12 relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[250px] bg-brand/15 blur-[100px] pointer-events-none" />

            <div className="relative">
              <div className="flex items-end justify-center gap-2 mb-2">
                <span className="text-6xl font-extrabold tabular text-foreground font-mono">$0</span>
                <span className="text-foreground-muted font-semibold mb-2">/ month</span>
              </div>
              <p className="text-foreground-muted mb-8 text-sm">Full access to all tools & features</p>

              <div className="grid sm:grid-cols-2 gap-3 max-w-md mx-auto text-left mb-8">
                {[
                  "Precision Position Size Calculator",
                  "Standard & Cent Account Modes",
                  "Dual TP Targets + Runner Lots",
                  "Gold, Forex & NAS100 Math",
                  "Velox Zenith AI Insights",
                  "Personal Finance & Debt Tracker",
                  "Goals, Routine & Task Manager",
                  "Trading Calendar & Analytics",
                ].map((feat) => (
                  <div key={feat} className="flex items-center gap-2 text-sm text-foreground">
                    <Check className="w-4 h-4 text-profit shrink-0" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>

              <Link href="/auth/sign-up">
                <Button size="lg" className="w-full sm:w-auto bg-brand text-brand-foreground hover:bg-brand/90 font-bold px-8 shadow-lg shadow-brand/25 glow-brand">
                  Create Free Account Now
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────────────────────────────────── FOOTER */}
      <footer className="border-t border-border py-10 bg-surface/50">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 text-foreground-muted">
            <Sparkles className="w-4 h-4 text-brand" />
            <span className="text-sm font-bold text-foreground">Velox Studio</span>
            <span className="text-xs text-foreground-subtle">© {new Date().getFullYear()}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-foreground-subtle">
            <Shield className="w-4 h-4 text-brand" />
            <span>Built for serious traders. Your data remains private.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
