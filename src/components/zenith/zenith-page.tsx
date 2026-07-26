"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  Brain,
  RefreshCw,
  Loader2,
  Target,
  Activity,
  Zap,
  Inbox,
} from "lucide-react";
import { cn, formatCurrency, formatPercent } from "@/lib/utils";
import { getZenithData, type ZenithData } from "@/lib/zenith/actions";
import {
  calculateMetrics,
  calculateDrawdown,
  currentStreak,
  breakdownBySetup,
  breakdownBySession,
  breakdownBySymbol,
  buildEquityCurve,
} from "@/lib/journal/metrics";
import {
  generateLocalInsights,
  type LocalInsight,
} from "@/lib/zenith/local-insights";
import { getAiInsights } from "@/lib/zenith/insights-client";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export function ZenithPage() {
  const [data, setData] = useState<ZenithData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // AI insight state
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await getZenithData();
    if (res.error) setError(res.error);
    setData(res);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Compute metrics from the raw trades
  const trades = data?.trades ?? [];
  const metrics = useMemo(() => calculateMetrics(trades), [trades]);
  const drawdown = useMemo(() => calculateDrawdown(trades), [trades]);
  const streak = useMemo(() => currentStreak(trades), [trades]);
  const equityCurve = useMemo(() => buildEquityCurve(trades), [trades]);
  const setupBreakdown = useMemo(() => breakdownBySetup(trades), [trades]);
  const sessionBreakdown = useMemo(() => breakdownBySession(trades), [trades]);
  const symbolBreakdown = useMemo(() => breakdownBySymbol(trades), [trades]);

  // Local insights (no API needed — always available)
  const localInsights = useMemo(
    () =>
      generateLocalInsights(
        metrics,
        setupBreakdown,
        sessionBreakdown,
        symbolBreakdown,
      ),
    [metrics, setupBreakdown, sessionBreakdown, symbolBreakdown],
  );

  // Fetch AI insight on demand
  const fetchAI = useCallback(async () => {
    setAiLoading(true);
    setAiError(null);
    const metricsJSON = JSON.stringify(
      {
        totalTrades: metrics.totalTrades,
        closedTrades: metrics.closedTrades,
        winRate: metrics.winRate,
        profitFactor: metrics.profitFactor,
        netPnl: metrics.netPnl,
        expectancy: metrics.expectancy,
        avgWin: metrics.avgWin,
        avgLoss: metrics.avgLoss,
        avgRMultiple: metrics.avgRMultiple,
        bestTrade: metrics.bestTrade,
        worstTrade: metrics.worstTrade,
        maxWinStreak: metrics.maxWinStreak,
        maxLossStreak: metrics.maxLossStreak,
        maxDrawdown: drawdown.maxDrawdown,
        currentStreak: streak,
        topSetups: setupBreakdown.slice(0, 3),
        topSessions: sessionBreakdown.slice(0, 3),
      },
      null,
      2,
    );
    const result = await getAiInsights(metricsJSON);
    setAiLoading(false);
    if (result) {
      setAiInsight(result);
    } else {
      setAiError(
        "Couldn't reach Velox Zenith AI engine. Check your API key in Settings, or rely on the local insights below.",
      );
    }
  }, [metrics, drawdown, streak, setupBreakdown, sessionBreakdown]);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Hero header */}
      <div className="relative overflow-hidden rounded-xl border border-brand/20 bg-gradient-to-br from-brand/5 via-surface to-surface p-6">
        <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />
        <div className="relative flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-brand/15 flex items-center justify-center glow-brand">
              <Sparkles className="w-6 h-6 text-brand" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Velox Zenith</h1>
              <p className="text-sm text-foreground-muted">
                AI-powered analysis of your trading performance.
              </p>
            </div>
          </div>
          {trades.length > 0 && (
            <Button variant="ghost" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
              Refresh
            </Button>
          )}
        </div>
      </div>

      {error && (
        <Card className="border-danger/30 bg-danger/5">
          <CardContent className="py-3 text-sm text-danger">{error}</CardContent>
        </Card>
      )}

      {loading ? (
        <ZenithSkeleton />
      ) : trades.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {/* KPI strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiTile
              label="Net P&L"
              value={formatCurrency(metrics.netPnl, { sign: true })}
              tone={metrics.netPnl >= 0 ? "profit" : "loss"}
              icon={<TrendingUp className="w-4 h-4" />}
            />
            <KpiTile
              label="Win Rate"
              value={formatPercent(metrics.winRate)}
              tone={metrics.winRate >= 0.5 ? "profit" : "neutral"}
              icon={<Target className="w-4 h-4" />}
            />
            <KpiTile
              label="Profit Factor"
              value={
                metrics.profitFactor === Infinity
                  ? "∞"
                  : metrics.profitFactor.toFixed(2)
              }
              tone={metrics.profitFactor >= 1.5 ? "profit" : "loss"}
              icon={<Activity className="w-4 h-4" />}
            />
            <KpiTile
              label="Expectancy"
              value={formatCurrency(metrics.expectancy, { sign: true })}
              tone={metrics.expectancy >= 0 ? "profit" : "loss"}
              icon={<Zap className="w-4 h-4" />}
            />
          </div>

          {/* AI Insight panel */}
          <Card glass className="border-brand/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Brain className="w-5 h-5 text-brand" />
                  <CardTitle className="text-base">AI Analysis</CardTitle>
                  <Badge variant="brand">Velox Zenith</Badge>
                </div>
                {!aiInsight && !aiLoading && (
                  <Button size="sm" onClick={fetchAI} variant="secondary">
                    <Sparkles className="w-3.5 h-3.5" />
                    Generate
                  </Button>
                )}
              </div>
              <CardDescription>
                Deep-dive into your performance with Velox Zenith AI.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {aiLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-4 w-3/4" />
                  <p className="text-xs text-foreground-subtle pt-2 flex items-center gap-2">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Analyzing your trading data...
                  </p>
                </div>
              ) : aiError ? (
                <div className="space-y-3">
                  <p className="text-sm text-foreground-muted">{aiError}</p>
                  <Button size="sm" variant="ghost" onClick={fetchAI}>
                    <RefreshCw className="w-3.5 h-3.5" />
                    Try again
                  </Button>
                </div>
              ) : aiInsight ? (
                <div className="space-y-3">
                  <div className="prose prose-sm prose-invert max-w-none text-sm leading-relaxed text-foreground-muted [&_strong]:text-foreground [&_b]:text-foreground whitespace-pre-wrap">
                    {aiInsight}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={fetchAI}
                    className="text-xs"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Regenerate
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-foreground-muted">
                  Click <span className="text-foreground">Generate</span> to let
                  Velox Zenith analyze your {metrics.closedTrades} closed trades and
                  surface the #1 thing to fix, your edge, and a tailored routine.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Local insights */}
          <div>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-warning" />
              Pattern Insights
            </h2>
            <div className="grid gap-3 md:grid-cols-2">
              {localInsights.map((insight, i) => (
                <InsightCard key={i} insight={insight} />
              ))}
            </div>
          </div>

          {/* Equity curve */}
          {equityCurve.length > 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Equity Curve</CardTitle>
                <CardDescription>
                  Cumulative P&amp;L across {equityCurve.length} closed trades.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={equityCurve}>
                      <defs>
                        <linearGradient id="zenithEquity" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#6366f1" stopOpacity={0.4} />
                          <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis
                        dataKey="index"
                        stroke="#71717a"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        stroke="#71717a"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => formatCurrency(v, { compact: true })}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#111113",
                          border: "1px solid #27272a",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                        labelStyle={{ color: "#71717a" }}
                        formatter={(value) => [
                          formatCurrency(Number(value)),
                          "Equity",
                        ]}
                      />
                      <Area
                        type="monotone"
                        dataKey="equity"
                        stroke="#6366f1"
                        strokeWidth={2}
                        fill="url(#zenithEquity)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Breakdown grid */}
          <div className="grid gap-4 lg:grid-cols-3">
            <BreakdownCard
              title="By Setup"
              rows={setupBreakdown}
              icon={<Target className="w-4 h-4" />}
            />
            <BreakdownCard
              title="By Session"
              rows={sessionBreakdown}
              icon={<Activity className="w-4 h-4" />}
            />
            <BreakdownCard
              title="By Symbol"
              rows={symbolBreakdown}
              icon={<TrendingUp className="w-4 h-4" />}
            />
          </div>
        </>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
//  Sub-components
// ────────────────────────────────────────────────────────────────

function KpiTile({
  label,
  value,
  tone = "neutral",
  icon,
}: {
  label: string;
  value: string;
  tone?: "profit" | "loss" | "neutral";
  icon: React.ReactNode;
}) {
  const toneClass =
    tone === "profit"
      ? "text-profit"
      : tone === "loss"
        ? "text-loss"
        : "text-foreground";
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium text-foreground-subtle uppercase tracking-wider">
            {label}
          </p>
          <span className="text-foreground-subtle">{icon}</span>
        </div>
        <p className={cn("text-2xl font-bold tabular", toneClass)}>{value}</p>
      </CardContent>
    </Card>
  );
}

function InsightCard({ insight }: { insight: LocalInsight }) {
  const config = {
    opportunity: {
      icon: <TrendingUp className="w-4 h-4" />,
      color: "text-profit",
      bg: "bg-profit/10",
      border: "border-profit/20",
      label: "Opportunity",
      badgeVariant: "profit" as const,
    },
    warning: {
      icon: <AlertTriangle className="w-4 h-4" />,
      color: "text-loss",
      bg: "bg-loss/10",
      border: "border-loss/20",
      label: "Warning",
      badgeVariant: "loss" as const,
    },
    info: {
      icon: <Lightbulb className="w-4 h-4" />,
      color: "text-info",
      bg: "bg-info/10",
      border: "border-info/20",
      label: "Insight",
      badgeVariant: "info" as const,
    },
  };
  const c = config[insight.type];

  return (
    <Card className={cn("border", c.border)}>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "w-7 h-7 rounded-md flex items-center justify-center",
                c.bg,
                c.color,
              )}
            >
              {c.icon}
            </div>
            <h3 className="text-sm font-semibold">{insight.title}</h3>
          </div>
          <Badge variant={c.badgeVariant} className="text-[10px]">
            {c.label}
          </Badge>
        </div>
        <p className="text-xs text-foreground-muted leading-relaxed pl-9">
          {insight.description}
        </p>
      </CardContent>
    </Card>
  );
}

function BreakdownCard({
  title,
  rows,
  icon,
}: {
  title: string;
  rows: import("@/lib/journal/metrics").BreakdownRow[];
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <span className="text-foreground-subtle">{icon}</span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.length === 0 ? (
          <p className="text-xs text-foreground-subtle py-4 text-center">
            No data yet
          </p>
        ) : (
          rows.slice(0, 5).map((row) => (
            <div
              key={row.key}
              className="flex items-center justify-between py-1.5 border-b border-border/40 last:border-0"
            >
              <span className="text-xs font-medium truncate">{row.key}</span>
              <div className="flex items-center gap-3 text-xs tabular">
                <span className="text-foreground-subtle">{row.trades}t</span>
                <span
                  className={cn(
                    row.winRate >= 0.5 ? "text-profit" : "text-foreground-subtle",
                  )}
                >
                  {formatPercent(row.winRate, 0)}
                </span>
                <span
                  className={cn(
                    "font-medium w-16 text-right",
                    row.netPnl >= 0 ? "text-profit" : "text-loss",
                  )}
                >
                  {formatCurrency(row.netPnl, { sign: true, compact: true })}
                </span>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function ZenithSkeleton() {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-48" />
      <div className="grid gap-3 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <Card glass className="border-brand/20">
      <CardContent className="py-16">
        <div className="text-center max-w-md mx-auto space-y-4">
          <div className="w-14 h-14 rounded-full bg-brand/10 flex items-center justify-center mx-auto">
            <Sparkles className="w-7 h-7 text-brand" />
          </div>
          <h2 className="text-lg font-semibold">Zenith needs data to think</h2>
          <p className="text-sm text-foreground-muted">
            Log a few trades in the Journal and Zenith will analyze your edge,
            spot patterns, and surface the #1 thing to improve. The more trades,
            the sharper the insights.
          </p>
          <a href="/dashboard/journal">
            <Button className="glow-brand">
              <Inbox className="w-4 h-4" />
              Open Journal
            </Button>
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
