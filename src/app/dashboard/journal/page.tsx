"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AnalyticsOverview } from "@/components/journal/analytics";
import { TradeList } from "@/components/journal/trade-list";
import { TradeForm } from "@/components/journal/trade-form";
import { getTrades } from "@/lib/journal/actions";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, Plus, LayoutDashboard, List, TrendingUp } from "lucide-react";
import type { Trade } from "@/lib/journal/types";
import { buildEquityCurve, calculateMetrics } from "@/lib/journal/metrics";
import { formatCurrency, formatPercent, cn } from "@/lib/utils";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

export default function JournalPage() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState("overview");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await getTrades();
    if (result.error) {
      setError(result.error);
    } else {
      setTrades(result.data ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const metrics = useMemo(() => calculateMetrics(trades), [trades]);
  const equityCurve = useMemo(() => buildEquityCurve(trades), [trades]);
  const netPnlPositive = metrics.netPnl >= 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-brand/10 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-brand" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Trading Journal</h1>
            <p className="text-sm text-foreground-muted">
              Log, review, and refine your edge.
            </p>
          </div>
        </div>
        <Button onClick={() => setTab("new")}>
          <Plus className="w-4 h-4" />
          New Trade
        </Button>
      </div>

      {/* Mini equity curve + stat pills — shown when data exists */}
      {!loading && trades.length > 0 && (
        <div className="rounded-xl border border-border bg-surface overflow-hidden">
          <div className="flex items-center gap-4 px-4 pt-3 pb-1 flex-wrap">
            {/* Stat pills */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-foreground-subtle">{metrics.closedTrades} trades</span>
            </div>
            <div className="w-px h-3 bg-border" />
            <div className={cn("text-sm font-bold tabular", netPnlPositive ? "text-profit" : "text-loss")}>
              {formatCurrency(metrics.netPnl, { sign: true })}
            </div>
            <div className="w-px h-3 bg-border" />
            <div className="text-xs text-foreground-muted">
              WR{" "}
              <span className={cn("font-semibold", metrics.winRate >= 0.5 ? "text-profit" : "text-foreground")}>
                {formatPercent(metrics.winRate, 0)}
              </span>
            </div>
            <div className="w-px h-3 bg-border" />
            <div className="text-xs text-foreground-muted">
              PF{" "}
              <span className="font-semibold text-foreground">
                {metrics.profitFactor === Infinity ? "∞" : metrics.profitFactor.toFixed(2)}
              </span>
            </div>
            <div className="w-px h-3 bg-border" />
            <div className="text-xs text-foreground-muted">
              Avg R{" "}
              <span className={cn("font-semibold", metrics.avgRMultiple >= 0 ? "text-profit" : "text-loss")}>
                {metrics.avgRMultiple >= 0 ? "+" : ""}{metrics.avgRMultiple.toFixed(2)}R
              </span>
            </div>
            <div className="ml-auto flex items-center gap-1 text-xs text-foreground-subtle">
              <TrendingUp className="w-3 h-3" />
              Equity Curve
            </div>
          </div>
          {equityCurve.length > 1 && (
            <div className="h-20">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={equityCurve} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="journalEquity" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={netPnlPositive ? "#22c55e" : "#ef4444"} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={netPnlPositive ? "#22c55e" : "#ef4444"} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Tooltip
                    contentStyle={{ backgroundColor: "#111113", border: "1px solid #27272a", borderRadius: "6px", fontSize: "11px" }}
                    formatter={(v) => [formatCurrency(Number(v)), "Equity"]}
                    labelFormatter={() => ""}
                  />
                  <Area
                    type="monotone"
                    dataKey="equity"
                    stroke={netPnlPositive ? "#22c55e" : "#ef4444"}
                    strokeWidth={1.5}
                    fill="url(#journalEquity)"
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {error && (
        <Card className="border-danger/30 bg-danger/5">
          <CardContent className="py-3 text-sm text-danger flex items-center justify-between">
            <span>{error}</span>
            <Button variant="ghost" size="sm" onClick={load}>
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="overview">
            <LayoutDashboard className="w-3.5 h-3.5" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="trades">
            <List className="w-3.5 h-3.5" />
            Trades
            {trades.length > 0 && (
              <span className="ml-1 text-xs text-foreground-subtle">
                ({trades.length})
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="new">
            <Plus className="w-3.5 h-3.5" />
            New Trade
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          {loading ? (
            <AnalyticsSkeleton />
          ) : (
            <AnalyticsOverview trades={trades} />
          )}
        </TabsContent>

        <TabsContent value="trades">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <TradeList trades={trades} onChanged={load} />
          )}
        </TabsContent>

        <TabsContent value="new">
          <div className="max-w-2xl">
            <TradeForm
              onSaved={() => {
                setTab("trades");
                load();
              }}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-5">
              <Skeleton className="h-3 w-20 mb-3" />
              <Skeleton className="h-8 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardContent className="p-5">
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}
