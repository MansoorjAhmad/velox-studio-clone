"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getRoutineItems, getRoutineLogs } from "@/lib/routine/actions";
import type { RoutineItem, RoutineLog, RoutineCategory } from "@/lib/routine/actions";
import {
  CalendarCheck,
  Flame,
  CheckCircle2,
  XCircle,
  Activity,
  Award,
  Target,
  Layers,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from "recharts";

const CATEGORY_LABELS: Record<RoutineCategory, string> = {
  deen: "Deen",
  life: "Life",
  trading: "Trading",
  work: "Work",
  growth: "Growth",
};

const CATEGORY_COLORS: Record<RoutineCategory, string> = {
  deen: "var(--profit)",
  life: "var(--loss)",
  trading: "var(--brand)",
  work: "var(--info)",
  growth: "var(--warning)",
};

export function RoutineAnalyticsPage() {
  const [items, setItems] = useState<RoutineItem[]>([]);
  const [logs, setLogs] = useState<RoutineLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<7 | 30 | 90>(30);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [hRes, lRes] = await Promise.all([getRoutineItems(), getRoutineLogs(90)]);
    if (hRes.error) setError(hRes.error);
    setItems(hRes.data ?? []);
    setLogs(lRes.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const stats = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - timeframe);
    const cutoffStr = cutoff.toISOString().split("T")[0];
    const periodLogs = logs.filter((l) => l.log_date >= cutoffStr);

    const daysInPeriod = timeframe;
    const expectedPerItem = daysInPeriod;
    const totalExpected = items.length * expectedPerItem;
    const totalCompleted = periodLogs.length;
    const overallPct = totalExpected > 0 ? Math.round((totalCompleted / totalExpected) * 100) : 0;

    const itemStats = items.map((item) => {
      const iLogs = periodLogs.filter((l) => l.item_id === item.id);
      const pct = expectedPerItem > 0 ? Math.round((iLogs.length / expectedPerItem) * 100) : 0;
      return {
        id: item.id,
        title: item.title,
        category: item.category,
        completed: iLogs.length,
        missed: Math.max(0, expectedPerItem - iLogs.length),
        pct: Math.min(100, pct),
      };
    });

    const categoryStats = (["deen", "life", "trading", "work", "growth"] as RoutineCategory[]).map((cat) => {
      const catItems = items.filter((i) => i.category === cat);
      const catLogs = periodLogs.filter((l) => l.category === cat);
      const expected = catItems.length * expectedPerItem;
      const pct = expected > 0 ? Math.round((catLogs.length / expected) * 100) : 0;
      return { category: cat, label: CATEGORY_LABELS[cat], pct, completed: catLogs.length, expected, color: CATEGORY_COLORS[cat] };
    }).filter((c) => c.expected > 0);

    // Daily completion heatmap (last N days)
    const heatDays: { date: string; label: string; completed: number; total: number; pct: number }[] = [];
    for (let i = timeframe - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const dayLogs = periodLogs.filter((l) => l.log_date === dateStr);
      const pct = items.length > 0 ? Math.round((dayLogs.length / items.length) * 100) : 0;
      heatDays.push({
        date: dateStr,
        label: d.toLocaleDateString("en-US", { weekday: "short", day: "numeric" }),
        completed: dayLogs.length,
        total: items.length,
        pct,
      });
    }

    // Current streak (consecutive days with >= 80% completion)
    let streak = 0;
    for (let i = heatDays.length - 1; i >= 0; i--) {
      if (heatDays[i].pct >= 80) streak++;
      else break;
    }

    const grade =
      overallPct >= 90 ? "A+ Apex" :
      overallPct >= 75 ? "A Solid" :
      overallPct >= 60 ? "B+ Building" :
      overallPct >= 40 ? "C Needs Focus" : "D Critical";

    return {
      overallPct,
      totalCompleted,
      totalMissed: Math.max(0, totalExpected - totalCompleted),
      itemStats,
      categoryStats,
      heatDays,
      streak,
      grade,
      daysInPeriod,
    };
  }, [items, logs, timeframe]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-brand/10 flex items-center justify-center">
            <Activity className="w-5 h-5 text-brand" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Daily Routine Analytics</h1>
            <p className="text-sm text-foreground-muted">
              Habit adherence heatmap, category compliance &amp; discipline index.
            </p>
          </div>
        </div>
        <div className="flex items-center rounded-lg border border-border bg-surface p-0.5">
          {([7, 30, 90] as const).map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={cn(
                "px-3.5 py-1.5 text-xs font-bold rounded-md transition-all",
                timeframe === tf ? "bg-brand text-white shadow-sm" : "text-foreground-muted hover:text-foreground",
              )}
            >
              {tf}D
            </button>
          ))}
        </div>
      </div>

      {error && (
        <Card className="border-loss/30">
          <CardContent className="py-3 text-sm text-loss">{error}</CardContent>
        </Card>
      )}

      {loading ? (
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Execution Rate", value: `${stats.overallPct}%`, color: "text-profit", icon: CheckCircle2, border: "border-profit/30" },
              { label: "Completed", value: `${stats.totalCompleted}`, color: "text-brand", icon: Target, border: "border-brand/30" },
              { label: "Missed Slots", value: `${stats.totalMissed}`, color: "text-loss", icon: XCircle, border: "border-loss/30" },
              { label: "Hot Streak", value: stats.streak > 0 ? `${stats.streak}d 🔥` : "—", color: "text-warning", icon: Flame, border: "border-warning/30" },
            ].map((kpi) => (
              <Card key={kpi.label} className={cn("card-hover", kpi.border)}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-foreground-subtle">{kpi.label}</p>
                    <p className={cn("text-2xl font-extrabold font-mono mt-1", kpi.color)}>{kpi.value}</p>
                  </div>
                  <kpi.icon className={cn("w-8 h-8 opacity-40", kpi.color)} />
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="card-hover border-warning/20">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Award className="w-8 h-8 text-warning" />
                <div>
                  <p className="text-xs font-bold text-warning uppercase tracking-wider">Discipline Index</p>
                  <p className="text-2xl font-extrabold">{stats.grade}</p>
                </div>
              </div>
              <Badge variant="outline" className="text-[10px]">{timeframe}-day window · {items.length} habits</Badge>
            </CardContent>
          </Card>

          {/* Daily heatmap */}
          <Card className="card-hover">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <CalendarCheck className="w-4 h-4 text-brand" />
                Daily Completion Heatmap
              </CardTitle>
              <CardDescription>% of habits completed each day over the last {timeframe} days.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 md:grid-cols-10 lg:grid-cols-15 gap-1 overflow-x-auto">
                {stats.heatDays.map((d) => {
                  const bg =
                    d.pct >= 70 ? "bg-surface-2 border-profit/40 text-profit" :
                    d.pct >= 40 ? "bg-surface-2 border-warning/40 text-warning" :
                    d.pct > 0   ? "bg-surface-2 border-loss/40 text-loss" :
                    "bg-surface-2 border-border/40 text-foreground-subtle";
                  return (
                    <div
                      key={d.date}
                      className={cn("h-14 rounded-md border p-1 text-center flex flex-col justify-between font-mono", bg)}
                      title={`${d.date}: ${d.completed}/${d.total} (${d.pct}%)`}
                    >
                      <span className="text-[7px] opacity-70">{d.label}</span>
                      <span className="font-display font-medium text-[10px]">{d.pct}%</span>
                      <span className="text-[6px] opacity-60">{d.completed}/{d.total}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Weekly bar chart */}
          <Card className="card-hover">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-brand" />
                Daily Adherence Trend
              </CardTitle>
            </CardHeader>
            <CardContent className="h-48 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.heatDays}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="label" stroke="var(--foreground-subtle)" fontSize={8} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                  <YAxis stroke="var(--foreground-subtle)" fontSize={10} tickLine={false} axisLine={false} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                  <Tooltip contentStyle={{ backgroundColor: "var(--surface)", borderColor: "var(--border)", borderRadius: "10px", fontSize: "11px", color: "var(--foreground)" }} formatter={(v) => [`${Number(v)}%`, "Completion"]} />
                  <Bar dataKey="pct" radius={[3, 3, 0, 0]}>
                    {stats.heatDays.map((d, i) => (
                      <Cell key={i} fill={d.pct >= 80 ? "var(--profit)" : d.pct >= 50 ? "var(--brand)" : "var(--loss)"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Category compliance */}
            <Card className="card-hover">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Layers className="w-4 h-4 text-brand" />
                  Category Compliance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {stats.categoryStats.length === 0 ? (
                  <p className="text-xs text-foreground-subtle text-center py-6">Add habits in Daily Routine.</p>
                ) : (
                  stats.categoryStats.map((c) => (
                    <div key={c.category} className="space-y-1">
                      <div className="flex justify-between text-xs font-bold">
                        <span>{c.label}</span>
                        <span className="font-mono" style={{ color: c.color }}>{c.pct}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-surface-3 overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${c.pct}%`, backgroundColor: c.color }} />
                      </div>
                      <p className="text-[10px] text-foreground-subtle">{c.completed}/{c.expected} slots completed</p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Per-habit breakdown */}
            <Card className="card-hover">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <CalendarCheck className="w-4 h-4 text-brand" />
                  Habit Adherence Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 max-h-80 overflow-y-auto">
                {stats.itemStats.length === 0 ? (
                  <p className="text-xs text-foreground-subtle text-center py-6">No habits configured.</p>
                ) : (
                  stats.itemStats.map((is) => (
                    <div key={is.id} className="p-2.5 rounded-lg border border-border bg-surface-2/30 space-y-1">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="flex items-center gap-2 truncate">
                          <span className="font-bold truncate">{is.title}</span>
                          <Badge variant="outline" className="text-[8px] uppercase shrink-0">{is.category}</Badge>
                        </span>
                        <span className="font-mono text-brand shrink-0">{is.pct}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-surface-3 overflow-hidden">
                        <div className="h-full bg-brand rounded-full" style={{ width: `${is.pct}%` }} />
                      </div>
                      <p className="text-[9px] text-foreground-subtle">{is.completed} done · {is.missed} missed · {timeframe}d window</p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
