"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PositionCalculator } from "@/components/calculator/position-calculator";
import {
  Sparkles,
  TrendingUp,
  ArrowLeft,
  ArrowRight,
  Target,
  BookOpen,
  DollarSign,
  Zap,
  Calculator,
  LayoutDashboard,
} from "lucide-react";
import { useState } from "react";

/* ── Mock data (purely cosmetic — no Supabase, no auth) ── */

const MOCK_TRADES = [
  { symbol: "XAUUSD", side: "LONG" as const,  pnl: 285.5,  r: 2.4, setup: "Breakout",     session: "London", win: true },
  { symbol: "XAUUSD", side: "SHORT" as const, pnl: -120.0, r: -1.0, setup: "Reversal",    session: "NY",     win: false },
  { symbol: "EURUSD", side: "LONG" as const,  pnl: 184.25, r: 1.8, setup: "Pullback",     session: "London", win: true },
  { symbol: "XAUUSD", side: "LONG" as const,  pnl: 312.0,  r: 3.1, setup: "Breakout",     session: "London", win: true },
  { symbol: "GBPUSD", side: "SHORT" as const, pnl: -85.0,  r: -1.0, setup: "Trend Cont.", session: "NY",     win: false },
  { symbol: "XAUUSD", side: "LONG" as const,  pnl: 245.75, r: 2.2, setup: "Pullback",     session: "London", win: true },
  { symbol: "BTCUSD", side: "LONG" as const,  pnl: 410.0,  r: 4.0, setup: "Breakout",     session: "Asia",   win: true },
];

const MOCK_PNL_SERIES = [
  { day: "Mon", pnl: 120 },
  { day: "Tue", pnl: -85 },
  { day: "Wed", pnl: 240 },
  { day: "Thu", pnl: 310 },
  { day: "Fri", pnl: -60 },
  { day: "Mon", pnl: 180 },
  { day: "Tue", pnl: 95 },
];

const MOCK_SETUPS = [
  { setup: "Breakout",       trades: 28, winRate: 0.71, pnl: 4280 },
  { setup: "Pullback",       trades: 22, winRate: 0.64, pnl: 3120 },
  { setup: "Trend Cont.",    trades: 19, winRate: 0.68, pnl: 2840 },
  { setup: "Reversal",       trades: 18, winRate: 0.50, pnl: -210 },
];

const totalTrades = MOCK_TRADES.length;
const wins = MOCK_TRADES.filter((t) => t.win).length;
const winRate = wins / totalTrades;
const netPnl = MOCK_TRADES.reduce((s, t) => s + t.pnl, 0);
const profitFactor = 2.34;

export default function DemoPage() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "calculator">("dashboard");
  const maxPnl = Math.max(...MOCK_PNL_SERIES.map((d) => Math.abs(d.pnl)));

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Demo banner */}
      <div className="bg-brand/10 border-b border-brand/20 text-brand text-center text-sm py-2 px-4 flex items-center justify-center gap-2">
        <Sparkles className="w-4 h-4 text-brand" />
        <span><strong className="font-semibold">Demo Sandbox Mode</strong> — Explore all features with sample data, no sign up needed.</span>{" "}
        <Link href="/auth/sign-up" className="underline font-bold hover:no-underline">
          Create free account →
        </Link>
      </div>

      {/* Nav */}
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-foreground-muted hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Back to Home</span>
          </Link>

          {/* Interactive Mode Selector */}
          <div className="flex items-center gap-1 rounded-lg border border-border bg-surface-2/60 p-1">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-semibold transition-all ${
                activeTab === "dashboard"
                  ? "bg-brand text-brand-foreground shadow-sm"
                  : "text-foreground-muted hover:text-foreground"
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              Journal & Analytics
            </button>
            <button
              onClick={() => setActiveTab("calculator")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-semibold transition-all ${
                activeTab === "calculator"
                  ? "bg-brand text-brand-foreground shadow-sm"
                  : "text-foreground-muted hover:text-foreground"
              }`}
            >
              <Calculator className="w-3.5 h-3.5" />
              Risk Calculator
            </button>
          </div>

          <Link href="/auth/sign-up">
            <Button size="sm" className="bg-brand text-brand-foreground font-semibold">
              Get Started Free
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {activeTab === "calculator" ? (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <Calculator className="w-6 h-6 text-brand" />
                Position Sizing & Risk Calculator
              </h1>
              <p className="text-sm text-foreground-muted mt-1">
                Calculate lot sizes with Cent Account toggle, Gold contract math, and partial profit strategies.
              </p>
            </div>
            <PositionCalculator />
          </div>
        ) : (
          <>
            {/* Header */}
            <div>
              <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-brand" />
                Trading OS Sandbox
              </h1>
              <p className="text-sm text-foreground-muted mt-1">
                Live interactive preview of your trading dashboard.
              </p>
            </div>

            {/* KPI row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard
                label="Total Trades"
                value={String(totalTrades)}
                icon={<BookOpen className="w-4 h-4 text-brand" />}
              />
              <KpiCard
                label="Win Rate"
                value={`${(winRate * 100).toFixed(1)}%`}
                icon={<TrendingUp className="w-4 h-4 text-profit" />}
              />
              <KpiCard
                label="Net P&L"
                value={`+$${netPnl.toFixed(0)}`}
                valueClass="text-profit"
                icon={<DollarSign className="w-4 h-4 text-brand" />}
              />
              <KpiCard
                label="Profit Factor"
                value={`${profitFactor.toFixed(2)}x`}
                icon={<Target className="w-4 h-4 text-info" />}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* P&L chart */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base">Daily P&L Performance</CardTitle>
                  <p className="text-xs text-foreground-subtle">Last 7 trading days</p>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end justify-between gap-3 h-44">
                    {MOCK_PNL_SERIES.map((d, i) => {
                      const h = (Math.abs(d.pnl) / maxPnl) * 100;
                      const positive = d.pnl >= 0;
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                          <span className="text-[10px] tabular text-foreground-subtle font-mono">
                            {d.pnl > 0 ? "+" : ""}{d.pnl}
                          </span>
                          <div
                            className={`w-full rounded-t-sm transition-all hover:opacity-80 ${positive ? "bg-profit/70" : "bg-loss/70"}`}
                            style={{ height: `${h}%` }}
                          />
                          <span className="text-[10px] text-foreground-subtle font-medium">{d.day}</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Setup performance */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Top Performing Setups</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2.5">
                  {MOCK_SETUPS.map((s) => (
                    <div key={s.setup} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{s.setup}</p>
                        <p className="text-xs text-foreground-subtle">
                          {s.trades} trades · {(s.winRate * 100).toFixed(0)}% win
                        </p>
                      </div>
                      <span className={`text-sm tabular font-semibold ${s.pnl >= 0 ? "text-profit" : "text-loss"}`}>
                        {s.pnl >= 0 ? "+" : ""}${s.pnl.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Recent trades */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recent Trade Log</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto -mx-5">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-wider text-foreground-subtle border-b border-border">
                        <th className="font-medium py-2 px-5">Symbol</th>
                        <th className="font-medium py-2 px-3">Side</th>
                        <th className="font-medium py-2 px-3">Setup</th>
                        <th className="font-medium py-2 px-3">Session</th>
                        <th className="font-medium py-2 px-3 text-right">R</th>
                        <th className="font-medium py-2 px-5 text-right">P&L</th>
                      </tr>
                    </thead>
                    <tbody>
                      {MOCK_TRADES.map((t, i) => (
                        <tr key={i} className="border-b border-border/50 hover:bg-surface-2/50 transition-colors">
                          <td className="py-3 px-5 font-medium tabular font-mono">{t.symbol}</td>
                          <td className="py-3 px-3">
                            <Badge variant={t.side === "LONG" ? "profit" : "loss"} className="text-[10px]">
                              {t.side}
                            </Badge>
                          </td>
                          <td className="py-3 px-3 text-foreground-muted">{t.setup}</td>
                          <td className="py-3 px-3 text-foreground-muted">{t.session}</td>
                          <td className={`py-3 px-3 text-right tabular font-mono ${t.r >= 0 ? "text-profit" : "text-loss"}`}>
                            {t.r > 0 ? "+" : ""}{t.r.toFixed(1)}R
                          </td>
                          <td className={`py-3 px-5 text-right tabular font-semibold font-mono ${t.pnl >= 0 ? "text-profit" : "text-loss"}`}>
                            {t.pnl >= 0 ? "+" : ""}${t.pnl.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Zenith teaser */}
            <Card glass className="border-brand/30 bg-gradient-to-br from-brand/5 to-surface">
              <CardContent className="py-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-brand/15 flex items-center justify-center shrink-0 border border-brand/20">
                    <Zap className="w-5 h-5 text-brand" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-foreground">Velox Zenith AI Analysis</h3>
                      <Badge variant="brand" className="text-[10px]">Zenith AI Active</Badge>
                    </div>
                    <p className="text-sm text-foreground-muted leading-relaxed">
                      Your win rate is <span className="text-profit font-semibold">31% higher</span> during the London session.
                      Breakout setups on Gold (XAUUSD) represent your strongest edge (+$4,280 P&L). Avoid Reversal trades during New York session to prevent negative expectancy.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* CTA */}
        <Card className="border-2 border-brand bg-surface">
          <CardContent className="py-10 text-center space-y-4">
            <Sparkles className="w-8 h-8 text-brand mx-auto" />
            <h2 className="text-2xl font-bold">Ready to track your real trades?</h2>
            <p className="text-sm text-foreground-muted max-w-md mx-auto">
              100% free. Pick your username and access your workspace instantly.
            </p>
            <Link href="/auth/sign-up">
              <Button size="lg" className="bg-brand text-brand-foreground font-bold shadow-lg shadow-brand/25 glow-brand">
                Create Your Free Account
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function KpiCard({
  label,
  value,
  valueClass = "",
  icon,
}: {
  label: string;
  value: string;
  valueClass?: string;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-xs font-semibold text-foreground-subtle uppercase tracking-wider">
          {label}
        </CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <p className={`text-2xl font-extrabold tabular font-mono ${valueClass}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
