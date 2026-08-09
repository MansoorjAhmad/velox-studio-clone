"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type TradingScore } from "@/lib/journal/metrics";
import { type DisciplineScore } from "@/lib/routine/score";
import { BarChart3, CalendarCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface PerformanceSnapshotWidgetProps {
  tradingScore: TradingScore;
  disciplineScore: DisciplineScore;
  hasTrades: boolean;
  hasRoutine: boolean;
}

export function PerformanceSnapshotWidget({
  tradingScore,
  disciplineScore,
  hasTrades,
  hasRoutine,
}: PerformanceSnapshotWidgetProps) {
  return (
    <Card className="card-hover">
      <CardHeader className="pb-3">
        <CardTitle className="font-display font-medium text-lg">
          Performance snapshot
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Left — Trading Score Sub-Card */}
          <div className="bg-surface-2 rounded-xl p-4 flex flex-col justify-between space-y-4 border border-border/60">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-foreground-subtle tracking-wider">
                Trading score
              </span>
              <BarChart3 className="w-3.5 h-3.5 text-foreground-subtle" />
            </div>

            {hasTrades ? (
              <div className="flex items-center gap-4 py-1">
                <ScoreDonut score={tradingScore.score} />
                <div className="space-y-1">
                  <span className="font-display font-medium text-2xl text-foreground block leading-none">
                    {tradingScore.score}
                  </span>
                  <span
                    className={cn(
                      "font-display italic text-xs font-semibold block",
                      tradingScore.score >= 40 ? "text-profit" : "text-danger"
                    )}
                  >
                    {tradingScore.grade}
                  </span>
                </div>
              </div>
            ) : (
              <div className="py-4 text-center">
                <p className="text-xs text-foreground-subtle">
                  Log your first trade to see this
                </p>
              </div>
            )}

            <div className="pt-2 border-t border-border/50 text-[11px] text-foreground-muted flex items-center justify-between font-mono">
              <span>
                Win rate:{" "}
                <strong className="text-foreground font-semibold">
                  {hasTrades ? `${tradingScore.winRateComponent.toFixed(1)}%` : "—"}
                </strong>
              </span>
              <span>
                PF score:{" "}
                <strong className="text-foreground font-semibold">
                  {hasTrades ? Math.round(tradingScore.profitFactorComponent) : "—"}
                </strong>
              </span>
            </div>
          </div>

          {/* Right — Discipline Score Sub-Card */}
          <div className="bg-surface-2 rounded-xl p-4 flex flex-col justify-between space-y-4 border border-border/60">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-foreground-subtle tracking-wider">
                Discipline score
              </span>
              <CalendarCheck className="w-3.5 h-3.5 text-foreground-subtle" />
            </div>

            {hasRoutine ? (
              <div className="flex items-center gap-4 py-1">
                <ScoreDonut score={disciplineScore.score} />
                <div className="space-y-1">
                  <span className="font-display font-medium text-2xl text-foreground block leading-none">
                    {disciplineScore.score}
                  </span>
                  <span
                    className={cn(
                      "font-display italic text-xs font-semibold block",
                      disciplineScore.score >= 40 ? "text-profit" : "text-danger"
                    )}
                  >
                    {disciplineScore.grade}
                  </span>
                </div>
              </div>
            ) : (
              <div className="py-4 text-center">
                <p className="text-xs text-foreground-subtle">
                  Configure daily routine to see this
                </p>
              </div>
            )}

            <div className="pt-2 border-t border-border/50 text-[11px] text-foreground-muted flex items-center justify-between font-mono">
              <span>
                Completion:{" "}
                <strong className="text-foreground font-semibold">
                  {hasRoutine ? `${Math.round(disciplineScore.completionComponent)}%` : "—"}
                </strong>
              </span>
              <span>
                Streak score:{" "}
                <strong className="text-foreground font-semibold">
                  {hasRoutine ? Math.round(disciplineScore.streakComponent) : "—"}
                </strong>
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ScoreDonut({ score }: { score: number }) {
  const radius = 24;
  const strokeWidth = 5;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const isGood = score >= 40;

  return (
    <div className="relative w-14 h-14 shrink-0 flex items-center justify-center">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 60 60">
        <circle
          cx="30"
          cy="30"
          r={radius}
          stroke="var(--border-strong)"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <circle
          cx="30"
          cy="30"
          r={radius}
          stroke={isGood ? "var(--profit)" : "var(--danger)"}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          fill="transparent"
          className="transition-all duration-700 ease-out"
        />
      </svg>
    </div>
  );
}
