"use client";

import { useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Target,
  Activity,
  Flame,
  DollarSign,
  Percent,
  Gauge,
  Inbox,
  Brain,
  ArrowUpDown,
} from "lucide-react";
import {
  calculateMetrics,
  buildEquityCurve,
  calculateDrawdown,
  breakdownBySetup,
  breakdownBySession,
  breakdownBySymbol,
  currentStreak,
} from "@/lib/journal/metrics";
import { cn, formatCurrency } from "@/lib/utils";
import type { Trade } from "@/lib/journal/types";

const tooltipStyle = {
  backgroundColor: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: "8px",
  fontSize: "12px",
  color: "var(--foreground)",
};

export function AnalyticsOverview({ trades }: { trades: Trade[] }) {
  const metrics = useMemo(() => calculateMetrics(trades), [trades]);
  const equity = useMemo(() => buildEquityCurve(trades), [trades]);
  const drawdown = useMemo(() => calculateDrawdown(trades), [trades]);
  const bySetup = useMemo(() => breakdownBySetup(trades), [trades]);
  const bySession = useMemo(() => breakdownBySession(trades), [trades]);
  const bySymbol = useMemo(() => breakdownBySymbol(trades), [trades]);
  const streak = useMemo(() => currentStreak(trades), [trades]);

  // ── MAE/MFE analysis ──
  const maeMfe = useMemo(() => computeMaeMfe(trades), [trades]);

  // ── Emotion correlation ──
  const emotionStats = useMemo(() => computeEmotionCorrelation(trades), [trades]);

  if (trades.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-surface/50 py-16 text-center">
        <Inbox className="w-10 h-10 text-foreground-subtle mx-auto mb-3" />
        <p className="text-sm font-medium">No analytics yet</p>
        <p className="text-xs text-foreground-muted mt-1">
          Log a few trades and your stats will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── KPI GRID ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Net P&L"
          value={formatCurrency(metrics.netPnl, { sign: true })}
          tone={metrics.netPnl > 0 ? "profit" : metrics.netPnl < 0 ? "loss" : "neutral"}
          icon={<DollarSign className="w-4 h-4" />}
          sub={`${metrics.closedTrades} closed`}
        />
        <KpiCard
          label="Win Rate"
          value={`${(metrics.winRate * 100).toFixed(1)}%`}
          tone={metrics.winRate >= 0.5 ? "profit" : "neutral"}
          icon={<Percent className="w-4 h-4" />}
          sub={`${metrics.wins}W / ${metrics.losses}L`}
        />
        <KpiCard
          label="Profit Factor"
          value={
            metrics.profitFactor === Infinity
              ? "∞"
              : `${metrics.profitFactor.toFixed(2)}`
          }
          tone={metrics.profitFactor >= 1 ? "profit" : "loss"}
          icon={<Gauge className="w-4 h-4" />}
          sub={metrics.profitFactor >= 1 ? "Profitable" : "Unprofitable"}
        />
        <KpiCard
          label="Expectancy"
          value={formatCurrency(metrics.expectancy, { sign: true })}
          tone={metrics.expectancy > 0 ? "profit" : "loss"}
          icon={<Target className="w-4 h-4" />}
          sub="per trade"
        />
      </div>

      {/* ── Secondary stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <MiniStat label="Avg Win" value={formatCurrency(metrics.avgWin)} tone="profit" />
        <MiniStat label="Avg Loss" value={formatCurrency(metrics.avgLoss)} tone="loss" />
        <MiniStat
          label="Avg R"
          value={`${metrics.avgRMultiple > 0 ? "+" : ""}${metrics.avgRMultiple.toFixed(2)}R`}
          tone={metrics.avgRMultiple >= 0 ? "profit" : "loss"}
        />
        <MiniStat
          label="Max DD"
          value={formatCurrency(-drawdown.maxDrawdown)}
          tone="loss"
        />
        <MiniStat
          label="Best Streak"
          value={`${metrics.maxWinStreak}`}
          icon={<Flame className="w-3 h-3 text-warning" />}
        />
        <MiniStat
          label="Worst Streak"
          value={`${metrics.maxLossStreak}`}
          tone="loss"
        />
      </div>

      {/* ── Equity curve ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="w-4 h-4 text-brand" />
            Equity Curve
          </CardTitle>
          <CardDescription>
            Cumulative P&L across {metrics.closedTrades} closed trades
            {streak.count > 0 && (
              <Badge
                variant={streak.type === "win" ? "profit" : "loss"}
                className="ml-2 text-[10px]"
              >
                <Flame className="w-3 h-3 mr-1" />
                {streak.count} {streak.type} streak
              </Badge>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {equity.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={equity} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="equityFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--brand)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--brand)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="index"
                  tick={{ fill: "var(--foreground-subtle)", fontSize: 11 }}
                  axisLine={{ stroke: "var(--border)" }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "var(--foreground-subtle)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={56}
                  tickFormatter={(v) => `$${v}`}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelFormatter={(l) => `Trade #${l}`}
                  formatter={(value) => [
                    formatCurrency(Number(value)),
                    "Equity",
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="equity"
                  stroke="var(--brand)"
                  strokeWidth={2}
                  fill="url(#equityFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-foreground-muted py-12 text-center">
              Close some trades to see your equity curve.
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── MAE/MFE Excursion Analysis ── */}
      {maeMfe.hasData && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowUpDown className="w-4 h-4 text-info" />
              Excursion Analysis (MAE / MFE)
            </CardTitle>
            <CardDescription>
              How far trades moved against you (MAE) vs in your favor (MFE) before exit.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <MiniStat
                label="Avg MFE"
                value={`${maeMfe.avgMfe.toFixed(2)}`}
                tone="profit"
              />
              <MiniStat
                label="Avg MAE"
                value={`${maeMfe.avgMae.toFixed(2)}`}
                tone="loss"
              />
              <MiniStat
                label="Capture Ratio"
                value={`${maeMfe.captureRatio.toFixed(0)}%`}
                tone={maeMfe.captureRatio >= 50 ? "profit" : "loss"}
              />
              <MiniStat
                label="Left on Table"
                value={`${maeMfe.avgLeftOnTable.toFixed(2)}`}
                tone="loss"
              />
            </div>
            <div className="rounded-lg border border-border bg-surface-2/50 p-3 text-xs text-foreground-muted">
              {maeMfe.captureRatio >= 60 ? (
                <span className="text-profit">
                  ✓ You&apos;re capturing {maeMfe.captureRatio.toFixed(0)}% of the max favorable move — strong trade management.
                </span>
              ) : maeMfe.captureRatio < 30 ? (
                <span className="text-loss">
                  ⚠ You&apos;re only capturing {maeMfe.captureRatio.toFixed(0)}% of the favorable move. Winners are being cut too early.
                </span>
              ) : (
                <span>
                  You capture {maeMfe.captureRatio.toFixed(0)}% of the favorable move. Aim for 50%+ by trailing stops or partial exits.
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Emotion Correlation ── */}
      {emotionStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Brain className="w-4 h-4 text-brand" />
              Psychology Edge — Emotions vs Performance
            </CardTitle>
            <CardDescription>
              Your win rate and P&amp;L broken down by how you felt entering the trade.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {emotionStats.map((e) => (
                <div
                  key={e.emotion}
                  className="flex items-center justify-between py-2 border-b border-border/40 last:border-0"
                >
                  <span className="text-sm font-medium capitalize">{e.emotion}</span>
                  <div className="flex items-center gap-4 text-xs tabular">
                    <span className="text-foreground-subtle">{e.count} trades</span>
                    <span
                      className={cn(
                        "font-semibold",
                        e.winRate >= 0.5 ? "text-profit" : e.winRate < 0.35 ? "text-loss" : "text-foreground-muted",
                      )}
                    >
                      {(e.winRate * 100).toFixed(0)}% win
                    </span>
                    <span
                      className={cn(
                        "font-semibold w-20 text-right",
                        e.netPnl > 0 ? "text-profit" : e.netPnl < 0 ? "text-loss" : "text-foreground-muted",
                      )}
                    >
                      {formatCurrency(e.netPnl, { sign: true })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            {emotionStats.length >= 3 && (
              <p className="text-xs text-foreground-subtle mt-3 pt-3 border-t border-border">
                💡 Your best emotional state:{" "}
                <span className="text-profit font-medium capitalize">
                  {emotionStats.reduce((best, cur) => (cur.netPnl > best.netPnl ? cur : best)).emotion}
                </span>
                . Your worst:{" "}
                <span className="text-loss font-medium capitalize">
                  {emotionStats.reduce((worst, cur) => (cur.netPnl < worst.netPnl ? cur : worst)).emotion}
                </span>
                .
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Breakdowns ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <BreakdownCard title="By Setup" rows={bySetup} />
        <BreakdownCard title="By Session" rows={bySession} />
        <BreakdownCard title="By Symbol" rows={bySymbol} />
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
//  Sub-components
// ────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  tone,
  icon,
  sub,
}: {
  label: string;
  value: string;
  tone: "profit" | "loss" | "neutral";
  icon: React.ReactNode;
  sub?: string;
}) {
  const toneClass =
    tone === "profit"
      ? "text-profit"
      : tone === "loss"
        ? "text-loss"
        : "text-foreground";
  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-xs font-medium text-foreground-subtle">
          {label}
        </CardTitle>
        <span className="text-foreground-subtle">{icon}</span>
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
  tone,
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
    <div className="rounded-md border border-border bg-surface px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-wider text-foreground-subtle mb-1">
        {label}
      </p>
      <p className={cn("text-sm font-semibold tabular flex items-center gap-1", toneClass)}>
        {icon}
        {value}
      </p>
    </div>
  );
}

interface BreakdownRow {
  key: string;
  trades: number;
  winRate: number;
  netPnl: number;
  avgR: number;
}

// ────────────────────────────────────────────────────────────────
//  MAE/MFE — Max Adverse / Favorable Excursion
// ────────────────────────────────────────────────────────────────

interface MaeMfeResult {
  hasData: boolean;
  avgMfe: number;         // average max favorable excursion (in price)
  avgMae: number;         // average max adverse excursion (in price, positive)
  captureRatio: number;   // % of MFE captured at exit (0-100)
  avgLeftOnTable: number; // MFE - |exit-entry| averaged
}

function computeMaeMfe(trades: Trade[]): MaeMfeResult {
  const closed = trades.filter(
    (t) =>
      t.status === "closed" &&
      t.mfe != null &&
      t.mae != null &&
      t.exit_price != null,
  );

  if (closed.length === 0) {
    return { hasData: false, avgMfe: 0, avgMae: 0, captureRatio: 0, avgLeftOnTable: 0 };
  }

  let totalMfe = 0;
  let totalMae = 0;
  let totalCaptured = 0;
  let totalLeftOnTable = 0;

  for (const t of closed) {
    const mfe = Math.abs(t.mfe!);
    const mae = Math.abs(t.mae!);
    const move = Math.abs(t.exit_price! - t.entry_price);

    totalMfe += mfe;
    totalMae += mae;
    totalCaptured += mfe > 0 ? (move / mfe) * 100 : 0;
    totalLeftOnTable += Math.max(0, mfe - move);
  }

  return {
    hasData: true,
    avgMfe: totalMfe / closed.length,
    avgMae: totalMae / closed.length,
    captureRatio: totalCaptured / closed.length,
    avgLeftOnTable: totalLeftOnTable / closed.length,
  };
}

// ────────────────────────────────────────────────────────────────
//  Emotion Correlation — win rate & P&L by pre-trade emotion
// ────────────────────────────────────────────────────────────────

interface EmotionStat {
  emotion: string;
  count: number;
  winRate: number;
  netPnl: number;
}

function computeEmotionCorrelation(trades: Trade[]): EmotionStat[] {
  const map = new Map<string, Trade[]>();

  for (const t of trades) {
    if (t.status !== "closed") continue;
    const emotions = t.emotion_before;
    if (!emotions || emotions.length === 0) continue;
    for (const e of emotions) {
      if (!map.has(e)) map.set(e, []);
      map.get(e)!.push(t);
    }
  }

  const results: EmotionStat[] = [];
  for (const [emotion, group] of map.entries()) {
    if (group.length < 1) continue;
    const wins = group.filter((t) => (t.pnl ?? 0) > 0).length;
    const netPnl = group.reduce((s, t) => s + (t.pnl ?? 0), 0);
    results.push({
      emotion,
      count: group.length,
      winRate: wins / group.length,
      netPnl,
    });
  }

  // Sort by count descending (most-felt emotions first)
  return results.sort((a, b) => b.count - a.count);
}

function BreakdownCard({
  title,
  rows,
}: {
  title: string;
  rows: BreakdownRow[];
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-xs text-foreground-subtle py-4 text-center">
            No data
          </p>
        ) : (
          <div className="space-y-2">
            {rows.slice(0, 6).map((r) => (
              <div
                key={r.key}
                className="flex items-center justify-between text-sm"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{r.key}</p>
                  <p className="text-xs text-foreground-subtle">
                    {r.trades} trades · {(r.winRate * 100).toFixed(0)}% win
                  </p>
                </div>
                <div className="text-right ml-3">
                  <p
                    className={cn(
                      "tabular font-semibold",
                      r.netPnl > 0 ? "text-profit" : r.netPnl < 0 ? "text-loss" : "text-foreground",
                    )}
                  >
                    {formatCurrency(r.netPnl, { sign: true })}
                  </p>
                  <p className="text-xs text-foreground-subtle tabular">
                    {r.avgR > 0 ? "+" : ""}
                    {r.avgR.toFixed(1)}R
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
