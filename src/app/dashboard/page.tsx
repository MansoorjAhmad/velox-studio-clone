"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { getTrades } from "@/lib/journal/actions";
import {
  calculateMetrics,
  calculateDrawdown,
  currentStreak,
} from "@/lib/journal/metrics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  TrendingUp,
  DollarSign,
  Target,
  Sparkles,
  Flame,
  ArrowRight,
  Calculator,
  CalendarCheck,
  CheckSquare,
  BarChart3,
  Zap,
  Clock,
} from "lucide-react";
import Link from "next/link";
import { cn, formatCurrency } from "@/lib/utils";
import type { Trade } from "@/lib/journal/types";
import { TradingCalendar } from "@/components/journal/trading-calendar";

export default function DashboardPage() {
  const supabase = createClient();
  const [username, setUsername] = useState<string>("");
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data: authData } = await supabase.auth.getUser();
    if (authData.user?.email) {
      setUsername(authData.user.email.split("@")[0]);
    }
    const result = await getTrades();
    if (!result.error) setTrades(result.data ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  const metrics = calculateMetrics(trades);
  const drawdown = calculateDrawdown(trades);
  const streak = currentStreak(trades);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {loading ? <Skeleton className="h-7 w-48" /> : `Welcome back, ${username || "trader"} 👋`}
          </h1>
          <p className="text-sm text-foreground-muted mt-1">
            Your complete performance overview at a glance.
          </p>
        </div>
        <Link href="/dashboard/journal">
          <Button className="bg-brand text-brand-foreground hover:bg-brand/90 glow-brand font-semibold">
            <BookOpen className="w-4 h-4" />
            Open Journal
          </Button>
        </Link>
      </div>

      {loading ? (
        <LoadingSkeleton />
      ) : trades.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {/* KPI grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-stagger">
            <KpiCard
              label="Total Trades"
              value={String(metrics.totalTrades)}
              icon={<BookOpen className="w-4 h-4 text-brand" />}
              sub={`${metrics.openTrades} open`}
              accent="brand"
            />
            <KpiCard
              label="Win Rate"
              value={`${(metrics.winRate * 100).toFixed(1)}%`}
              icon={<TrendingUp className="w-4 h-4 text-profit" />}
              tone={metrics.winRate >= 0.5 ? "profit" : "neutral"}
              sub={`${metrics.wins}W / ${metrics.losses}L`}
              accent="profit"
            />
            <KpiCard
              label="Net P&L"
              value={formatCurrency(metrics.netPnl, { sign: true })}
              icon={<DollarSign className="w-4 h-4 text-brand" />}
              tone={metrics.netPnl >= 0 ? "profit" : "loss"}
              sub={`PF ${metrics.profitFactor === Infinity ? "∞" : metrics.profitFactor.toFixed(2)}`}
              accent={metrics.netPnl >= 0 ? "profit" : "loss"}
            />
            <KpiCard
              label="Expectancy"
              value={formatCurrency(metrics.expectancy, { sign: true })}
              icon={<Target className="w-4 h-4 text-info" />}
              tone={metrics.expectancy >= 0 ? "profit" : "loss"}
              sub="per trade"
              accent="info"
            />
          </div>

          {/* Secondary stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 animate-stagger">
            <MiniStat
              label="Current Streak"
              value={
                streak.count > 0
                  ? `${streak.count} ${streak.type === "win" ? "W 🔥" : "L"}`
                  : "—"
              }
              tone={streak.type === "win" ? "profit" : streak.type === "loss" ? "loss" : "neutral"}
              icon={<Flame className="w-3 h-3" />}
            />
            <MiniStat
              label="Max Drawdown"
              value={formatCurrency(-drawdown.maxDrawdown)}
              tone="loss"
            />
            <MiniStat
              label="Avg Win"
              value={formatCurrency(metrics.avgWin)}
              tone="profit"
            />
            <MiniStat
              label="Avg Loss"
              value={formatCurrency(metrics.avgLoss)}
              tone="loss"
            />
          </div>

          {/* Two-column: recent trades + quick links */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent trades — spans 2 cols */}
            <Card className="lg:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-brand" />
                  <CardTitle className="text-base">Recent Trades</CardTitle>
                </div>
                <Link href="/dashboard/journal">
                  <Button variant="ghost" size="sm" className="text-xs">
                    View all
                    <ArrowRight className="w-3 h-3" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {trades.slice(0, 6).map((t) => (
                    <div
                      key={t.id}
                      className={cn(
                        "flex items-center justify-between py-2.5 border-b border-border/40 last:border-0 group hover:bg-surface-2/50 rounded-md px-2 transition-colors duration-100",
                        "border-l-2 pl-3",
                        (t.pnl ?? 0) > 0 ? "border-l-profit/60" : (t.pnl ?? 0) < 0 ? "border-l-loss/60" : "border-l-border",
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Badge
                          variant={t.direction === "LONG" ? "profit" : "loss"}
                          className="text-[10px] shrink-0"
                        >
                          {t.direction}
                        </Badge>
                        <div>
                          <p className="text-sm font-semibold tabular">{t.symbol}</p>
                          <p className="text-xs text-foreground-subtle">
                            {t.setup ?? "—"} · {t.session ?? "—"}
                          </p>
                        </div>
                      </div>
                      <p
                        className={cn(
                          "text-sm tabular font-bold",
                          (t.pnl ?? 0) > 0 && "text-profit",
                          (t.pnl ?? 0) < 0 && "text-loss",
                          t.pnl == null && "text-foreground-subtle",
                        )}
                      >
                        {t.pnl != null ? formatCurrency(t.pnl, { sign: true }) : "—"}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quick links panel */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-foreground-subtle px-0.5">
                Quick Access
              </p>
              {[
                {
                  href: "/dashboard/calculator",
                  icon: <Calculator className="w-4 h-4 text-brand" />,
                  label: "Risk Calculator",
                  sub: "Size your position",
                  bg: "bg-brand/5 border-brand/15 hover:bg-brand/10 hover:border-brand/30",
                },
                {
                  href: "/dashboard/finances",
                  icon: <DollarSign className="w-4 h-4 text-emerald-400" />,
                  label: "Finances",
                  sub: "Income & expenses",
                  bg: "bg-emerald-500/5 border-emerald-500/15 hover:bg-emerald-500/10 hover:border-emerald-500/30",
                },
                {
                  href: "/dashboard/routine",
                  icon: <CalendarCheck className="w-4 h-4 text-amber-400" />,
                  label: "Daily Routine",
                  sub: "Track your habits",
                  bg: "bg-amber-500/5 border-amber-500/15 hover:bg-amber-500/10 hover:border-amber-500/30",
                },
                {
                  href: "/dashboard/goals",
                  icon: <Target className="w-4 h-4 text-rose-400" />,
                  label: "Goals",
                  sub: "Track your targets",
                  bg: "bg-rose-500/5 border-rose-500/15 hover:bg-rose-500/10 hover:border-rose-500/30",
                },
                {
                  href: "/dashboard/tasks",
                  icon: <CheckSquare className="w-4 h-4 text-info" />,
                  label: "Tasks",
                  sub: "Manage your to-dos",
                  bg: "bg-info/5 border-info/15 hover:bg-info/10 hover:border-info/30",
                },
                {
                  href: "/dashboard/time",
                  icon: <Clock className="w-4 h-4 text-purple-400" />,
                  label: "Time Tracking",
                  sub: "Track your hours",
                  bg: "bg-purple-500/5 border-purple-500/15 hover:bg-purple-500/10 hover:border-purple-500/30",
                },
                {
                  href: "/dashboard/zenith",
                  icon: <Sparkles className="w-4 h-4 text-violet-400" />,
                  label: "Velox Zenith AI",
                  sub: "Ask your AI co-pilot",
                  bg: "bg-violet-500/5 border-violet-500/15 hover:bg-violet-500/10 hover:border-violet-500/30",
                },
              ].map((item) => (
                <Link key={item.href} href={item.href}>
                  <div
                    className={cn(
                      "flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-all duration-150 cursor-pointer",
                      item.bg,
                    )}
                  >
                    <div className="shrink-0">{item.icon}</div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground leading-none">{item.label}</p>
                      <p className="text-[11px] text-foreground-muted mt-0.5 leading-none">{item.sub}</p>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-foreground-subtle ml-auto shrink-0 opacity-50" />
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Trading Calendar */}
          <TradingCalendar trades={trades} />
        </>
      )}
    </div>
  );
}

/* ── Sub-components ── */

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-3 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-20 mb-1" />
              <Skeleton className="h-3 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-14 rounded-md" />
        ))}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <Card className="border-brand/20 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 bg-dots opacity-40 pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-32 bg-brand/10 blur-[60px] pointer-events-none rounded-full" />
      <CardContent className="relative py-16">
        <div className="text-center max-w-md mx-auto space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center mx-auto animate-glow-pulse">
            <Zap className="w-8 h-8 text-brand" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Log your first trade</h2>
            <p className="text-sm text-foreground-muted mt-2 leading-relaxed">
              Your dashboard comes alive once you start journaling. Every metric — win rate, P&L, expectancy — updates the moment you log a trade.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Link href="/dashboard/journal">
              <Button className="bg-brand text-brand-foreground hover:bg-brand/90 glow-brand font-semibold">
                Open Journal
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/dashboard/calculator">
              <Button variant="outline">
                <Calculator className="w-4 h-4" />
                Risk Calculator
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function KpiCard({
  label,
  value,
  tone = "neutral",
  icon,
  sub,
  accent = "brand",
}: {
  label: string;
  value: string;
  tone?: "profit" | "loss" | "neutral";
  icon: React.ReactNode;
  sub?: string;
  accent?: "brand" | "profit" | "loss" | "info";
}) {
  const toneClass =
    tone === "profit"
      ? "text-profit"
      : tone === "loss"
        ? "text-loss"
        : "text-foreground";

  const accentBorder =
    accent === "profit"
      ? "border-t-profit/50"
      : accent === "loss"
        ? "border-t-loss/50"
        : accent === "info"
          ? "border-t-info/50"
          : "border-t-brand/50";

  return (
    <Card className={cn("border-t-2 card-hover", accentBorder)}>
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-xs font-medium text-foreground-subtle">
          {label}
        </CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <p className={cn("text-2xl font-bold tabular", toneClass)}>{value}</p>
        {sub && <p className="text-xs text-foreground-subtle mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function MiniStat({
  label,
  value,
  tone = "neutral",
  icon,
}: {
  label: string;
  value: string;
  tone?: "profit" | "loss" | "neutral";
  icon?: React.ReactNode;
}) {
  const toneClass =
    tone === "profit"
      ? "text-profit"
      : tone === "loss"
        ? "text-loss"
        : "text-foreground";
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2.5 card-hover">
      <p className="text-[10px] uppercase tracking-wider text-foreground-subtle mb-1">
        {label}
      </p>
      <p className={cn("text-sm font-bold tabular flex items-center gap-1", toneClass)}>
        {icon}
        {value}
      </p>
    </div>
  );
}
