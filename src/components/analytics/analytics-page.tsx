"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { PageTransition, FadeIn } from "@/components/ui/motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { EmptyState } from "@/components/ui/empty-state";
import { ChartTooltip } from "@/components/ui/chart-tooltip";
import { getTrades } from "@/lib/journal/actions";
import { TradingCalendarWidget } from "@/components/dashboard/trading-calendar-widget";
import {
  buildEquityCurve,
  calculateMetrics,
  calculateDrawdown,
  calculateDrawdownDetails,
  buildStreakHistory,
  breakdownBySetup,
  breakdownBySymbol,
  buildDrawdownCurve,
  buildRMultipleBuckets,
  buildEmotionStats,
  buildMonthlyPnl,
} from "@/lib/journal/metrics";
import type { Trade } from "@/lib/journal/types";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Clock,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Award,
  Globe,
  Shield,
  Flame,
  Zap,
  Target,
  Layers,
  Brain,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  Brush,
  ReferenceLine,
} from "recharts";
import { getTradingAccounts } from "@/lib/accounts/actions";
import type { TradingAccount } from "@/lib/accounts/types";
import { getTradingConfig } from "@/lib/trading-config";
import { getActiveAccountId, setActiveAccountIdSynced } from "@/lib/accounts/active-account";

export function AnalyticsPage() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [accounts, setAccounts] = useState<TradingAccount[]>([]);
  const [activeAccId, setActiveAccId] = useState<string>("all");
  const [initialLoad, setInitialLoad] = useState(true);
  const [timeframe, setTimeframe] = useState<"7D" | "30D" | "90D" | "ALL">("30D");
  const [activeTab, setActiveTab] = useState<"overview" | "calendar" | "detailed">("overview");

  const load = useCallback(async () => {
    const [tradesRes, accsRes] = await Promise.all([getTrades(), getTradingAccounts()]);
    const allAccs = accsRes.data ?? [];
    setAccounts(allAccs);

    const savedAccId = getActiveAccountId();
    setActiveAccId(savedAccId);

    let data = tradesRes.data ?? [];
    if (savedAccId && savedAccId !== "all") {
      data = data.filter((t: any) => t.account_id === savedAccId);
    }
    setTrades(data);
    setInitialLoad(false);
  }, []);

  useEffect(() => {
    load();
    const h = () => load();
    window.addEventListener("active_account_changed", h);
    return () => window.removeEventListener("active_account_changed", h);
  }, [load]);

  /* ── Filter by timeframe ── */
  const filteredTrades = useMemo(() => {
    if (timeframe === "ALL") return trades;
    const days = timeframe === "7D" ? 7 : timeframe === "30D" ? 30 : 90;
    const cutoff = new Date(Date.now() - days * 86400000);
    return trades.filter((t) => new Date(t.entry_time) >= cutoff);
  }, [trades, timeframe]);

  /* ── Metrics ── */
  const metrics = useMemo(() => calculateMetrics(filteredTrades), [filteredTrades]);
  const drawdown = useMemo(() => calculateDrawdown(filteredTrades), [filteredTrades]);
  const ddDetails = useMemo(() => calculateDrawdownDetails(filteredTrades), [filteredTrades]);
  const equityCurve = useMemo(() => buildEquityCurve(filteredTrades), [filteredTrades]);
  const drawdownCurve = useMemo(() => buildDrawdownCurve(filteredTrades), [filteredTrades]);
  const streakHistory = useMemo(() => buildStreakHistory(filteredTrades), [filteredTrades]);
  const rBuckets = useMemo(() => buildRMultipleBuckets(filteredTrades), [filteredTrades]);
  const emotionStats = useMemo(() => buildEmotionStats(filteredTrades), [filteredTrades]);
  const monthlyPnl = useMemo(() => buildMonthlyPnl(filteredTrades, 6), [filteredTrades]);
  const setupRows = useMemo(() => breakdownBySetup(filteredTrades), [filteredTrades]);
  const symbolRows = useMemo(() => breakdownBySymbol(filteredTrades), [filteredTrades]);

  const confluenceRows = useMemo(() => {
    const map = new Map<string, { trades: number; wins: number; pnl: number }>();
    for (const t of filteredTrades) {
      if (t.status !== "closed" || t.pnl == null || !t.confluences?.length) continue;
      for (const c of t.confluences) {
        const ex = map.get(c) ?? { trades: 0, wins: 0, pnl: 0 };
        map.set(c, {
          trades: ex.trades + 1,
          wins: ex.wins + (t.pnl > 0 ? 1 : 0),
          pnl: ex.pnl + t.pnl,
        });
      }
    }
    return Array.from(map.entries())
      .map(([tag, d]) => ({ tag, ...d, winRate: d.trades > 0 ? (d.wins / d.trades) * 100 : 0 }))
      .sort((a, b) => b.pnl - a.pnl);
  }, [filteredTrades]);

  /* ── Stats ── */
  const stats = useMemo(() => {
    const closed = filteredTrades.filter((t) => t.status === "closed" && t.pnl != null);
    const winners = closed.filter((t) => t.pnl! > 0);
    const losers = closed.filter((t) => t.pnl! < 0);

    const totalWinPnl = winners.reduce((s, t) => s + (t.pnl ?? 0), 0);
    const totalLossPnl = Math.abs(losers.reduce((s, t) => s + (t.pnl ?? 0), 0));
    const netPnl = totalWinPnl - totalLossPnl;

    const avgWin = winners.length > 0 ? totalWinPnl / winners.length : 0;
    const avgLoss = losers.length > 0 ? -totalLossPnl / losers.length : 0;
    const bestTrade = closed.length > 0 ? Math.max(...closed.map((t) => t.pnl!)) : 0;
    const worstTrade = closed.length > 0 ? Math.min(...closed.map((t) => t.pnl!)) : 0;

    // Long vs Short
    const longs = closed.filter((t) => t.direction === "LONG");
    const shorts = closed.filter((t) => t.direction === "SHORT");
    const longWR = longs.length > 0 ? (longs.filter((t) => t.pnl! > 0).length / longs.length) * 100 : 0;
    const shortWR = shorts.length > 0 ? (shorts.filter((t) => t.pnl! > 0).length / shorts.length) * 100 : 0;
    const longPnl = longs.reduce((s, t) => s + (t.pnl ?? 0), 0);
    const shortPnl = shorts.reduce((s, t) => s + (t.pnl ?? 0), 0);

    // Sessions
    const sessions = (["Asia", "London", "New York"] as const).map((sess) => {
      const st = closed.filter((t) => t.session === sess);
      const sw = st.filter((t) => t.pnl! > 0);
      return {
        session: sess,
        emoji: sess === "Asia" ? "🌏" : sess === "London" ? "🇬🇧" : "🇺🇸",
        color: sess === "Asia" ? "border-l-warning" : sess === "London" ? "border-l-info" : "border-l-brand",
        count: st.length,
        pnl: st.reduce((s, t) => s + (t.pnl ?? 0), 0),
        winRate: st.length > 0 ? (sw.length / st.length) * 100 : 0,
      };
    });

    // MAE & MFE
    const withMae = closed.filter((t) => t.mae != null);
    const withMfe = closed.filter((t) => t.mfe != null);
    const avgMae = withMae.length > 0 ? withMae.reduce((s, t) => s + Math.abs(t.mae!), 0) / withMae.length : null;
    const avgMfe = withMfe.length > 0 ? withMfe.reduce((s, t) => s + Math.abs(t.mfe!), 0) / withMfe.length : null;

    return {
      closed: closed.length, winners: winners.length, losers: losers.length,
      netPnl, totalWinPnl, totalLossPnl, avgWin, avgLoss, bestTrade, worstTrade,
      winRate: closed.length > 0 ? (winners.length / closed.length) * 100 : 0,
      profitFactor: totalLossPnl > 0 ? totalWinPnl / totalLossPnl : totalWinPnl > 0 ? 99 : 0,
      expectedPayoff: closed.length > 0 ? netPnl / closed.length : 0,
      longs: { count: longs.length, winRate: longWR, pnl: longPnl },
      shorts: { count: shorts.length, winRate: shortWR, pnl: shortPnl },
      sessions, avgMae, avgMfe,
      maeCount: withMae.length, mfeCount: withMfe.length,
    };
  }, [filteredTrades]);

  /* ── Hourly Heatmap ── */
  const hourlyData = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => ({ hour: i, total: 0, wins: 0, pnl: 0 }));
    for (const t of filteredTrades) {
      if (!t.entry_time || t.status !== "closed" || t.pnl == null) continue;
      const h = new Date(t.entry_time).getUTCHours();
      hours[h].total++;
      if (t.pnl > 0) hours[h].wins++;
      hours[h].pnl += t.pnl;
    }
    return hours.map((h) => ({ ...h, winRate: h.total > 0 ? Math.round((h.wins / h.total) * 100) : 0 }));
  }, [filteredTrades]);

  /* ── Day of Week ── */
  const dayOfWeekData = useMemo(() => {
    const days = [
      { name: "Mon", pnl: 0, count: 0 }, { name: "Tue", pnl: 0, count: 0 },
      { name: "Wed", pnl: 0, count: 0 }, { name: "Thu", pnl: 0, count: 0 },
      { name: "Fri", pnl: 0, count: 0 },
    ];
    for (const t of filteredTrades) {
      if (!t.entry_time || t.status !== "closed" || t.pnl == null) continue;
      const d = new Date(t.entry_time).getUTCDay();
      if (d >= 1 && d <= 5) { days[d - 1].pnl += t.pnl; days[d - 1].count++; }
    }
    return days;
  }, [filteredTrades]);

  if (initialLoad) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Skeleton className="h-14 w-full" />
        <div className="grid grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  return (
    <PageTransition className="space-y-6">
      {/* ═══ HEADER ═══ */}
      <FadeIn>
        <div className="glass-subtle rounded-xl border border-border/60 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-brand/10 border border-brand/20 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-brand" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-medium tracking-tight">Performance Analytics</h1>
              <p className="text-xs text-foreground-muted">Quantitative edge analysis, equity curve, Velox calendar &amp; session breakdown.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {/* View Tab Selector */}
            <div className="flex items-center rounded-lg border border-border bg-surface p-0.5">
              {(["overview", "calendar", "detailed"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "px-3 py-1.5 text-xs font-semibold rounded-md transition-all capitalize",
                    activeTab === tab
                      ? "bg-brand text-brand-foreground shadow-sm"
                      : "text-foreground-muted hover:text-foreground"
                  )}
                >
                  {tab === "overview" ? "Overview" : tab === "calendar" ? "📅 Velox Calendar" : "Detailed Edge Stats"}
                </button>
              ))}
            </div>

            {/* Timeframe Selector */}
            <div className="flex items-center rounded-lg border border-border bg-surface p-0.5">
              {(["7D", "30D", "90D", "ALL"] as const).map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={cn("px-3 py-1.5 text-xs font-bold rounded-md transition-all", timeframe === tf ? "bg-surface-3 text-foreground shadow-sm" : "text-foreground-muted hover:text-foreground")}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>
        </div>
      </FadeIn>

      {/* Account Filter Sync Banner */}
      {activeAccId !== "all" && (
        (() => {
          const activeAcc = accounts.find((a) => a.id === activeAccId);
          return (
            <div className="flex items-center justify-between p-3 rounded-xl border border-brand/25 bg-brand/10 backdrop-blur-md animate-fade-in text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: activeAcc?.color || "var(--brand)" }} />
                <span className="font-semibold text-foreground">
                  Analytics filtered for: <span className="text-brand font-bold">{activeAcc ? activeAcc.name : "Selected Account"}</span>
                  {activeAcc && ` (${activeAcc.account_type.toUpperCase()} · Initial: ${formatCurrency(activeAcc.initial_balance)})`}
                </span>
              </div>
              <button
                onClick={() => {
                  setActiveAccountIdSynced("all");
                }}
                className="text-[10px] text-foreground-subtle hover:text-foreground underline font-mono"
              >
                Reset to All Accounts
              </button>
            </div>
          );
        })()
      )}

      {/* ═══ TAB: VELOX CALENDAR ═══ */}
      {activeTab === "calendar" ? (
        <TradingCalendarWidget trades={filteredTrades} />
      ) : activeTab === "overview" ? (
        <>
          {/* ═══ TAB: OVERVIEW ═══ */}
          {/* ═══ PRIMARY KPI ROW ═══ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-stagger">
        {[
          { label: "Net Realized P&L", value: stats.netPnl, fmt: true, sub: `From ${stats.closed} closed trades`, icon: DollarSign },
          { label: "Win Rate", value: stats.winRate, fmt: false, pct: true, sub: `${stats.winners}W / ${stats.losers}L`, icon: Target, brandColor: true },
          { label: "Profit Factor", value: stats.profitFactor, fmt: false, sub: stats.profitFactor > 1.5 ? "✓ Healthy Edge" : "Needs Improvement", icon: Shield, emerald: true },
          { label: "Expected Payoff", value: stats.expectedPayoff, fmt: true, sub: "Average per trade", icon: Zap },
        ].map((kpi) => (
          <Card key={kpi.label} className="card-hover">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-md bg-surface-2 flex items-center justify-center">
                  <kpi.icon className="w-3.5 h-3.5 text-foreground-subtle" />
                </div>
                <span className="text-[10px] text-foreground-subtle uppercase tracking-wider font-bold">{kpi.label}</span>
              </div>
              <p className={cn(
                "text-2xl font-extrabold font-mono tabular",
                kpi.brandColor ? "text-brand" : kpi.emerald ? "text-emerald-400" : kpi.value >= 0 ? "text-profit" : "text-loss",
              )}>
                {kpi.fmt ? (
                  <AnimatedCounter value={kpi.value} format="currency" signed />
                ) : kpi.pct ? (
                  <AnimatedCounter value={kpi.value / 100} format="percent" decimals={1} />
                ) : (
                  <AnimatedCounter value={kpi.value} format="decimal" decimals={2} />
                )}
              </p>
              <p className={cn("text-[10px] mt-1", typeof kpi.sub === "string" && kpi.sub.startsWith("✓") ? "text-profit" : "text-foreground-muted")}>{kpi.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ═══ SECONDARY KPI ROW ═══ */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {[
          { label: "Avg Win", value: stats.avgWin, color: "text-profit" },
          { label: "Avg Loss", value: stats.avgLoss, color: "text-loss" },
          { label: "Best Trade", value: stats.bestTrade, color: "text-profit" },
          { label: "Worst Trade", value: stats.worstTrade, color: "text-loss" },
          { label: "Max Drawdown", value: -drawdown.maxDrawdown, color: "text-loss" },
          { label: "Avg Hold", value: metrics.avgHoldMinutes, color: "text-brand", minutes: true },
        ].map((kpi) => (
          <Card key={kpi.label} className="card-hover">
            <CardContent className="p-3.5">
              <span className="text-[10px] text-foreground-subtle uppercase tracking-wider font-bold">{kpi.label}</span>
              <p className={cn("text-lg font-bold font-mono tabular mt-0.5", kpi.color)}>
                {"minutes" in kpi && kpi.minutes
                  ? `${Math.round(kpi.value)}m`
                  : <AnimatedCounter value={kpi.value} format="currency" signed />}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ═══ EQUITY CURVE (hero) ═══ */}
      <Card className="card-hover border-brand/15 relative overflow-hidden">
        <div className="absolute -right-24 -top-24 w-72 h-72 rounded-full bg-brand/5 blur-3xl pointer-events-none" />
        <CardHeader className="pb-2 relative">
          <CardTitle className="text-sm flex items-center justify-between">
            <span className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-brand" />
              Cumulative Equity Curve
            </span>
            <div className="flex items-center gap-1.5">
              {ddDetails.maxDrawdownPct > 0 && (
                <Badge variant="loss" className="text-[10px]">
                  Max DD {(ddDetails.maxDrawdownPct * 100).toFixed(1)}%
                </Badge>
              )}
              {ddDetails.recovered && ddDetails.recoveryTimeDays != null ? (
                <Badge variant="profit" className="text-[10px]">
                  Recovered in {ddDetails.recoveryTimeDays}d
                </Badge>
              ) : ddDetails.maxDrawdown > 0 ? (
                <Badge variant="warning" className="text-[10px]">Not yet recovered</Badge>
              ) : null}
              <Badge variant="brand" className="text-[10px]">{equityCurve.length} trades</Badge>
            </div>
          </CardTitle>
          <CardDescription>
            Drag the brush below to zoom. Drawdown lasted{" "}
            <span className="text-foreground font-medium">{ddDetails.maxDrawdownDurationDays}d</span>{" "}
            across <span className="text-foreground font-medium">{ddDetails.maxDrawdownDurationTrades}</span> trades.
          </CardDescription>
        </CardHeader>
        <CardContent className={cn("pt-2 relative", equityCurve.length > 1 ? "h-80" : "h-72")}>
          {equityCurve.length === 0 ? (
            <EmptyState
              icon={TrendingUp}
              title="No equity curve yet"
              description="Close your first trade to start building your equity curve."
              action={{ label: "Log a trade", href: "/dashboard/journal" }}
            />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={equityCurve}>
                <defs>
                  <linearGradient id="anaEqGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--brand)" stopOpacity={0.35} />
                    <stop offset="60%" stopColor="var(--brand)" stopOpacity={0.08} />
                    <stop offset="100%" stopColor="var(--brand)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
                <XAxis dataKey="date" stroke="var(--foreground-subtle)" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--foreground-subtle)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} width={56} />
                <Tooltip
                  cursor={{ stroke: "var(--brand)", strokeWidth: 1, strokeDasharray: "4 4" }}
                  content={<ChartTooltip
                    labelFormatter={(l) => `Trade ${l}`}
                    formatter={(val) => [formatCurrency(Number(val)), "Cumulative P&L"]}
                    colorBySign
                  />}
                />
                <Area
                  type="monotone"
                  dataKey="equity"
                  stroke="var(--brand)"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#anaEqGrad)"
                  dot={false}
                  activeDot={{ r: 5, fill: "var(--brand)", stroke: "var(--surface)", strokeWidth: 2 }}
                />
                {equityCurve.length > 1 && (
                  <Brush
                    dataKey="date"
                    height={24}
                    stroke="var(--brand)"
                    fill="var(--surface-2)"
                    travellerWidth={10}
                    tickFormatter={() => ""}
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* ═══ WIN/LOSS STREAK TRACKER ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-7 card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Flame className="w-4 h-4 text-brand" />
              Win / Loss Streak Tracker
            </CardTitle>
            <CardDescription>Chronological streak runs. Green = winning streak, red = losing streak.</CardDescription>
          </CardHeader>
          <CardContent>
            {streakHistory.length === 0 ? (
              <EmptyState
                icon={Flame}
                title="No streaks yet"
                description="Close trades to start tracking your win/loss streak runs."
                size="sm"
              />
            ) : (
              <>
                {/* Streak run bars */}
                <div className="flex items-end gap-1 h-24 mb-3">
                  {streakHistory.slice(-24).map((run, i) => {
                    const maxLen = Math.max(...streakHistory.slice(-24).map((r) => r.length), 1);
                    const heightPct = (run.length / maxLen) * 100;
                    return (
                      <div
                        key={i}
                        className="flex-1 min-w-[6px] rounded-t-sm transition-all hover:opacity-80 cursor-default group relative"
                        style={{
                          height: `${heightPct}%`,
                          backgroundColor: run.type === "win" ? "#34d399" : run.type === "loss" ? "#fb7185" : "#52525b",
                          opacity: 0.45 + 0.55 * (i / Math.max(1, Math.min(24, streakHistory.length))),
                        }}
                        title={`${run.type === "win" ? "Win" : run.type === "loss" ? "Loss" : "BE"} streak of ${run.length} · ${formatCurrency(run.pnl, { sign: true })}`}
                      />
                    );
                  })}
                </div>
                {/* Summary stats */}
                <div className="grid grid-cols-4 gap-3 pt-3 border-t border-border">
                  <div>
                    <p className="text-[9px] text-foreground-subtle uppercase tracking-wider font-bold">Longest Win</p>
                    <p className="text-lg font-bold font-mono tabular text-profit">
                      {Math.max(0, ...streakHistory.filter((r) => r.type === "win").map((r) => r.length))}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] text-foreground-subtle uppercase tracking-wider font-bold">Longest Loss</p>
                    <p className="text-lg font-bold font-mono tabular text-loss">
                      {Math.max(0, ...streakHistory.filter((r) => r.type === "loss").map((r) => r.length))}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] text-foreground-subtle uppercase tracking-wider font-bold">Current</p>
                    <p className={cn(
                      "text-lg font-bold font-mono tabular",
                      streakHistory[streakHistory.length - 1]?.type === "win"
                        ? "text-profit"
                        : streakHistory[streakHistory.length - 1]?.type === "loss"
                        ? "text-loss"
                        : "text-foreground",
                    )}>
                      {streakHistory[streakHistory.length - 1]?.length ?? 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] text-foreground-subtle uppercase tracking-wider font-bold">Total Runs</p>
                    <p className="text-lg font-bold font-mono tabular text-brand">
                      <AnimatedCounter value={streakHistory.length} />
                    </p>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Drawdown recovery details */}
        <Card className="lg:col-span-5 card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-loss" />
              Drawdown &amp; Recovery
            </CardTitle>
            <CardDescription>Peak-to-trough decline and time to recover.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-foreground-subtle">Max Drawdown</span>
              <span className="text-xl font-bold font-mono tabular text-loss">
                -<AnimatedCounter value={ddDetails.maxDrawdown} format="currency" />
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-foreground-subtle">Max Drawdown %</span>
              <span className="text-sm font-bold font-mono tabular text-loss">
                <AnimatedCounter value={ddDetails.maxDrawdownPct} format="percent" />
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-foreground-subtle">Duration</span>
              <span className="text-sm font-bold font-mono tabular text-foreground">
                {ddDetails.maxDrawdownDurationDays}d · {ddDetails.maxDrawdownDurationTrades} trades
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-foreground-subtle">Recovery Time</span>
              {ddDetails.recovered ? (
                <Badge variant="profit" className="text-[10px]">{ddDetails.recoveryTimeDays}d to recover</Badge>
              ) : ddDetails.maxDrawdown > 0 ? (
                <Badge variant="warning" className="text-[10px]">Still in drawdown</Badge>
              ) : (
                <span className="text-sm text-foreground-subtle">—</span>
              )}
            </div>
            {ddDetails.troughDate && (
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <span className="text-[10px] text-foreground-subtle">Trough</span>
                <span className="text-[10px] font-mono text-foreground-muted">{ddDetails.troughDate}</span>
              </div>
            )}
            {ddDetails.recoveryDate && (
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-foreground-subtle">Recovered</span>
                <span className="text-[10px] font-mono text-foreground-muted">{ddDetails.recoveryDate}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
        </>
      ) : (
        <>
          {/* ═══ TAB: DETAILED EDGE STATS ═══ */}
          {/* ═══ HOURLY EXECUTION HEATMAP ═══ */}
      <Card className="card-hover">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="w-4 h-4 text-brand" />
            Hourly Execution Heatmap (00:00 – 23:00 UTC)
          </CardTitle>
          <CardDescription>Win rate % by trading hour. Find your peak performance windows.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-8 md:grid-cols-12 lg:grid-cols-24 gap-1">
            {hourlyData.map((h) => {
              const bg =
                h.total === 0
                  ? "bg-surface-2/30 border-border/30 text-foreground-subtle/50"
                  : h.winRate >= 70
                  ? "bg-profit/20 border-profit/40 text-profit"
                  : h.winRate >= 50
                  ? "bg-brand/15 border-brand/30 text-brand"
                  : "bg-loss/15 border-loss/30 text-loss";

              return (
                <div
                  key={h.hour}
                  className={cn("h-16 rounded-md border p-1 text-center flex flex-col justify-between font-mono transition-all hover:scale-105 cursor-default", bg)}
                  title={`${String(h.hour).padStart(2, "0")}:00 UTC · ${h.wins}/${h.total} Wins (${h.winRate}%) · P&L: $${h.pnl.toFixed(0)}`}
                >
                  <span className="text-[8px] opacity-60">{String(h.hour).padStart(2, "0")}h</span>
                  <span className="text-[10px] font-bold">{h.total > 0 ? `${h.winRate}%` : "—"}</span>
                  <span className="text-[7px] opacity-50">{h.total > 0 ? `${h.total}t` : ""}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ═══ DAY OF WEEK + LONG VS SHORT ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Day of Week */}
        <Card className="lg:col-span-7 card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Calendar className="w-4 h-4 text-brand" />
              Day of Week Performance
            </CardTitle>
            <CardDescription>Net P&amp;L by trading day (Mon–Fri).</CardDescription>
          </CardHeader>
          <CardContent className="h-56 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dayOfWeekData} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
                <XAxis dataKey="name" stroke="var(--foreground-subtle)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--foreground-subtle)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                <Tooltip
                  cursor={{ fill: "var(--surface-2)", radius: 4 }}
                  content={<ChartTooltip
                    labelFormatter={(l) => String(l)}
                    formatter={(val) => [formatCurrency(Number(val)), "Net P&L"]}
                    colorBySign
                  />}
                />
                <Bar dataKey="pnl" radius={[6, 6, 2, 2]}>
                  {dayOfWeekData.map((entry, index) => (
                    <Cell key={`dow-${index}`} fill={entry.pnl >= 0 ? "#34d399" : "#fb7185"} fillOpacity={0.9} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Long vs Short */}
        <Card className="lg:col-span-5 card-hover">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="w-4 h-4 text-brand" />
              Long vs Short Split
            </CardTitle>
            <CardDescription>Direction bias and performance comparison.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Long */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-profit flex items-center gap-1.5 font-bold">
                  <ArrowUpRight className="w-3.5 h-3.5" /> LONG ({stats.longs.count} trades)
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-brand">{stats.longs.winRate.toFixed(1)}% WR</span>
                  <span className={cn("font-mono font-bold text-xs", stats.longs.pnl >= 0 ? "text-profit" : "text-loss")}>
                    {stats.longs.pnl >= 0 ? "+" : ""}{formatCurrency(stats.longs.pnl)}
                  </span>
                </div>
              </div>
              <div className="h-2.5 rounded-full bg-surface-3 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-profit/80 to-profit rounded-full transition-all duration-700 ease-out" style={{ width: `${stats.longs.winRate}%` }} />
              </div>
            </div>

            {/* Short */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-loss flex items-center gap-1.5 font-bold">
                  <ArrowDownRight className="w-3.5 h-3.5" /> SHORT ({stats.shorts.count} trades)
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-brand">{stats.shorts.winRate.toFixed(1)}% WR</span>
                  <span className={cn("font-mono font-bold text-xs", stats.shorts.pnl >= 0 ? "text-profit" : "text-loss")}>
                    {stats.shorts.pnl >= 0 ? "+" : ""}{formatCurrency(stats.shorts.pnl)}
                  </span>
                </div>
              </div>
              <div className="h-2.5 rounded-full bg-surface-3 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-loss/80 to-loss rounded-full transition-all duration-700 ease-out" style={{ width: `${stats.shorts.winRate}%` }} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ═══ SESSION PERFORMANCE ═══ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.sessions.map((sess) => (
          <Card key={sess.session} className={cn("card-hover border-l-[3px]", sess.color)}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold">{sess.emoji} {sess.session}</span>
                <Badge variant="outline" className="text-[10px]">{sess.count} trades</Badge>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-foreground-subtle">Win Rate</span>
                  <span className="font-mono font-bold text-brand">{sess.winRate.toFixed(1)}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-surface-3 overflow-hidden">
                  <div className="h-full bg-brand rounded-full transition-all duration-700 ease-out" style={{ width: `${sess.winRate}%` }} />
                </div>
                <div className="flex justify-between text-xs pt-1">
                  <span className="text-foreground-subtle">Net P&amp;L</span>
                  <span className={cn("font-mono font-bold", sess.pnl >= 0 ? "text-profit" : "text-loss")}>
                    {sess.pnl >= 0 ? "+" : ""}{formatCurrency(sess.pnl)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ═══ MAE / MFE EXECUTION QUALITY ═══ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-loss" />
              MAE — Max Adverse Excursion
            </CardTitle>
            <CardDescription>Average maximum drawdown per trade before close.</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.avgMae !== null ? (
              <div className="space-y-3">
                <p className="text-3xl font-extrabold font-mono tabular text-loss">
                  -{formatCurrency(stats.avgMae)}
                </p>
                <p className="text-[10px] text-foreground-muted">Based on {stats.maeCount} trades with MAE data.</p>
                <div className="h-2 rounded-full bg-surface-3 overflow-hidden">
                  <div className="h-full bg-loss/60 rounded-full transition-all duration-700" style={{ width: `${Math.min(100, stats.avgMae * 2)}%` }} />
                </div>
                <p className="text-[10px] text-foreground-subtle">Lower MAE = tighter entries. Target: minimize adverse movement.</p>
              </div>
            ) : (
              <div className="py-8 text-center border border-dashed border-border rounded-lg">
                <TrendingDown className="w-8 h-8 text-foreground-subtle/20 mx-auto mb-2" />
                <p className="text-xs text-foreground-subtle">No MAE data recorded yet. Add MAE values to your trades.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-profit" />
              MFE — Max Favorable Excursion
            </CardTitle>
            <CardDescription>Average maximum favorable movement per trade before close.</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.avgMfe !== null ? (
              <div className="space-y-3">
                <p className="text-3xl font-extrabold font-mono tabular text-profit">
                  +{formatCurrency(stats.avgMfe)}
                </p>
                <p className="text-[10px] text-foreground-muted">Based on {stats.mfeCount} trades with MFE data.</p>
                <div className="h-2 rounded-full bg-surface-3 overflow-hidden">
                  <div className="h-full bg-profit/60 rounded-full transition-all duration-700" style={{ width: `${Math.min(100, stats.avgMfe * 2)}%` }} />
                </div>
                <p className="text-[10px] text-foreground-subtle">Higher MFE = better trade selection. Compare MFE to actual exit to find missed profits.</p>
              </div>
            ) : (
              <div className="py-8 text-center border border-dashed border-border rounded-lg">
                <TrendingUp className="w-8 h-8 text-foreground-subtle/20 mx-auto mb-2" />
                <p className="text-xs text-foreground-subtle">No MFE data recorded yet. Add MFE values to your trades.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ═══ DRAWDOWN UNDERWATER + MONTHLY P&L ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-7 card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-loss" />
              Drawdown Underwater Chart
            </CardTitle>
            <CardDescription>Peak-to-trough equity decline over time.</CardDescription>
          </CardHeader>
          <CardContent className="h-56 pt-2">
            {drawdownCurve.length === 0 ? (
              <div className="h-full flex items-center justify-center border border-dashed border-border rounded-lg">
                <p className="text-xs text-foreground-subtle">Close trades to visualize drawdown.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={drawdownCurve}>
                  <defs>
                    <linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#fb7185" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#fb7185" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="date" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#0f172a", borderColor: "#1e293b", borderRadius: "10px", fontSize: "11px" }}
                    formatter={(val) => [formatCurrency(Number(val)), "Drawdown"]}
                  />
                  <Area type="monotone" dataKey="drawdown" stroke="#fb7185" strokeWidth={2} fill="url(#ddGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-5 card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Calendar className="w-4 h-4 text-brand" />
              Monthly P&amp;L Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="h-56 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyPnl}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="label" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0f172a", borderColor: "#1e293b", borderRadius: "10px", fontSize: "11px" }}
                  formatter={(val, _n, p) => [`${formatCurrency(Number(val))} · ${(p?.payload as { trades?: number })?.trades ?? 0} trades`, "Net P&L"]}
                />
                <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                  {monthlyPnl.map((entry, i) => (
                    <Cell key={i} fill={entry.pnl >= 0 ? "#34d399" : "#fb7185"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* ═══ R-MULTIPLE DISTRIBUTION ═══ */}
      <Card className="card-hover">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Target className="w-4 h-4 text-brand" />
            R-Multiple Distribution
          </CardTitle>
          <CardDescription>How your trades cluster across R buckets — edge quality at a glance.</CardDescription>
        </CardHeader>
        <CardContent className="h-48 pt-2">
          {rBuckets.every((b) => b.count === 0) ? (
            <div className="h-full flex items-center justify-center border border-dashed border-border rounded-lg">
              <p className="text-xs text-foreground-subtle">Log R-multiples on closed trades to unlock this chart.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rBuckets} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" stroke="var(--foreground-subtle)" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="label" stroke="var(--foreground-subtle)" fontSize={10} tickLine={false} axisLine={false} width={80} />
                <Tooltip contentStyle={{ backgroundColor: "var(--surface)", borderColor: "var(--border)", borderRadius: "10px", fontSize: "11px", color: "var(--foreground)" }} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {rBuckets.map((b, i) => (
                    <Cell key={i} fill={b.label.includes("-") ? "var(--loss)" : "var(--brand)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* ═══ SETUP + SYMBOL + CONFLUENCE BREAKDOWNS ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {[
          { title: "Setup Performance", rows: setupRows, icon: Layers },
          { title: "Symbol Performance", rows: symbolRows, icon: Globe },
        ].map(({ title, rows, icon: Icon }) => (
          <Card key={title} className="card-hover lg:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Icon className="w-4 h-4 text-brand" />
                {title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-64 overflow-y-auto">
              {rows.length === 0 ? (
                <p className="text-xs text-foreground-subtle text-center py-6">No data yet.</p>
              ) : (
                rows.map((r) => (
                  <div key={r.key} className="p-2.5 rounded-lg border border-border bg-surface-2/30 space-y-1">
                    <div className="flex justify-between text-xs font-bold">
                      <span>{r.key}</span>
                      <span className="text-brand">{(r.winRate * 100).toFixed(0)}% WR</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-surface-3 overflow-hidden">
                      <div className="h-full bg-brand rounded-full" style={{ width: `${r.winRate * 100}%` }} />
                    </div>
                    <div className="flex justify-between text-[10px] font-mono">
                      <span className="text-foreground-subtle">{r.trades} trades · {r.avgR.toFixed(1)}R avg</span>
                      <span className={r.netPnl >= 0 ? "text-profit" : "text-loss"}>
                        {r.netPnl >= 0 ? "+" : ""}{formatCurrency(r.netPnl)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        ))}

        <Card className="card-hover lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Award className="w-4 h-4 text-brand" />
              Confluence Edge
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-64 overflow-y-auto">
            {confluenceRows.length === 0 ? (
              <p className="text-xs text-foreground-subtle text-center py-6">Tag confluences on trades.</p>
            ) : (
              confluenceRows.map((c) => (
                <div key={c.tag} className="p-2.5 rounded-lg border border-border bg-surface-2/30 space-y-1">
                  <div className="flex justify-between text-xs font-bold">
                    <Badge variant="outline" className="text-[9px]">{c.tag}</Badge>
                    <span className="text-brand">{c.winRate.toFixed(0)}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-surface-3 overflow-hidden">
                    <div className="h-full bg-brand rounded-full" style={{ width: `${c.winRate}%` }} />
                  </div>
                  <div className="flex justify-between text-[10px] font-mono">
                    <span className="text-foreground-subtle">{c.trades} trades</span>
                    <span className={c.pnl >= 0 ? "text-profit" : "text-loss"}>
                      {c.pnl >= 0 ? "+" : ""}{formatCurrency(c.pnl)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* ═══ EMOTION CORRELATION ═══ */}
      <Card className="card-hover">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Brain className="w-4 h-4 text-brand" />
            Emotion → Performance Correlation
          </CardTitle>
          <CardDescription>Pre-trade emotional state vs win rate and net P&amp;L.</CardDescription>
        </CardHeader>
        <CardContent>
          {emotionStats.length === 0 ? (
            <div className="py-10 text-center border border-dashed border-border rounded-lg">
              <p className="text-xs text-foreground-subtle">Log pre-trade emotions on your trades to unlock psychology analytics.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {emotionStats.map((e) => (
                <div key={e.emotion} className="p-3 rounded-lg border border-border bg-surface-2/30">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-bold capitalize">{e.emotion}</span>
                    <Badge variant="outline" className="text-[9px]">{e.trades} trades</Badge>
                  </div>
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-brand font-bold">{e.winRate.toFixed(0)}% WR</span>
                    <span className={e.netPnl >= 0 ? "text-profit" : "text-loss"}>
                      {e.netPnl >= 0 ? "+" : ""}{formatCurrency(e.netPnl)}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-surface-3 overflow-hidden mt-2">
                    <div className="h-full bg-brand rounded-full" style={{ width: `${e.winRate}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
        </>
      )}
    </PageTransition>
  );
}
