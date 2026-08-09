"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getGoals } from "@/lib/goals/actions";
import type { Goal } from "@/lib/goals/types";
import { GOAL_CATEGORIES } from "@/lib/goals/types";
import {
  PieChart,
  Target,
  CheckCircle2,
  Clock,
  Award,
  Zap,
  TrendingUp,
  Activity,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function GoalsAnalyticsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await getGoals();
    if (res.error) setError(res.error);
    setGoals(res.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const stats = useMemo(() => {
    const total = goals.length;
    const completed = goals.filter((g) => g.completed).length;
    const pending = total - completed;
    const overallPct = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Period breakdown
    const periods = ["weekly", "monthly", "quarterly", "annual", "custom"] as const;
    const periodStats = periods.map((p) => {
      const pGoals = goals.filter((g) => g.period === p);
      const pComp = pGoals.filter((g) => g.completed).length;
      const pct = pGoals.length > 0 ? Math.round((pComp / pGoals.length) * 100) : 0;
      return { period: p, total: pGoals.length, completed: pComp, pct };
    });

    // Category breakdown
    const catStats = GOAL_CATEGORIES.map((cat) => {
      const cGoals = goals.filter((g) => g.category === cat.value);
      const cComp = cGoals.filter((g) => g.completed).length;
      const pct = cGoals.length > 0 ? Math.round((cComp / cGoals.length) * 100) : 0;
      return { category: cat.label, emoji: cat.emoji, total: cGoals.length, completed: cComp, pct };
    });

    return { total, completed, pending, overallPct, periodStats, catStats };
  }, [goals]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-brand/10 flex items-center justify-center">
            <PieChart className="w-5 h-5 text-brand" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Goals Analytics</h1>
            <p className="text-sm text-foreground-muted">
              Target velocity, category compliance, & milestone completion metrics.
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-profit/30">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-profit font-bold uppercase tracking-wider">Overall Completion</p>
                  <p className="text-3xl font-bold font-mono text-profit mt-1">{stats.overallPct}%</p>
                  <p className="text-[10px] text-foreground-muted mt-1">{stats.completed} of {stats.total} targets hit</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-profit/15 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-profit" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-warning/30 bg-warning/5">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-warning font-bold uppercase tracking-wider">Pending Targets</p>
                  <p className="text-3xl font-bold font-mono text-warning mt-1">{stats.pending}</p>
                  <p className="text-[10px] text-foreground-muted mt-1">Active goals in progress</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-warning/15 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-warning" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-brand/30 bg-brand/5">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-brand font-bold uppercase tracking-wider">Target Velocity Score</p>
                  <p className="text-3xl font-bold font-mono text-brand mt-1">
                    {stats.overallPct >= 80 ? "A+" : stats.overallPct >= 50 ? "B+" : "C"}
                  </p>
                  <p className="text-[10px] text-foreground-muted mt-1">Based on milestone rate</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-brand/15 flex items-center justify-center">
                  <Award className="w-6 h-6 text-brand" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Breakdown Grids */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Period Breakdown */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Target className="w-4 h-4 text-brand" />
                  Completion Rate by Period
                </CardTitle>
                <CardDescription>Target execution across timeframes.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {stats.periodStats.map((ps) => (
                  <div key={ps.period} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="capitalize text-foreground-muted">{ps.period} Goals</span>
                      <span className="font-mono text-brand">{ps.pct}% ({ps.completed}/{ps.total})</span>
                    </div>
                    <div className="h-2 rounded-full bg-surface-3 overflow-hidden">
                      <div className="h-full bg-brand transition-all duration-500" style={{ width: `${ps.pct}%` }} />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Category Breakdown */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Layers className="w-4 h-4 text-brand" />
                  Compliance by Category
                </CardTitle>
                <CardDescription>Target execution across life pillars.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {stats.catStats.map((cs) => (
                  <div key={cs.category} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="flex items-center gap-1.5 text-foreground-muted">
                        <span>{cs.emoji}</span>
                        {cs.category}
                      </span>
                      <span className="font-mono text-profit">{cs.pct}% ({cs.completed}/{cs.total})</span>
                    </div>
                    <div className="h-2 rounded-full bg-surface-3 overflow-hidden">
                      <div className="h-full bg-profit transition-all duration-500" style={{ width: `${cs.pct}%` }} />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
