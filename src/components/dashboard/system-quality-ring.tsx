"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SystemQualityBreakdown } from "@/lib/journal/system-quality";

interface SystemQualityRingProps {
  quality: SystemQualityBreakdown;
}

export function SystemQualityRing({ quality }: SystemQualityRingProps) {
  const { overall, discipline, execution, riskCompliance } = quality;

  const segments = [
    { label: "Discipline Rating", value: discipline, color: "bg-brand", hex: "var(--brand)" },
    { label: "Execution Quality", value: execution, color: "bg-profit", hex: "var(--profit)" },
    { label: "Risk Compliance", value: riskCompliance, color: "bg-warning", hex: "var(--warning)" },
  ];

  // Build conic gradient from segment proportions
  let cursor = 0;
  const stops: string[] = [];
  for (const seg of segments) {
    const end = cursor + seg.value / 3;
    stops.push(`${seg.hex} ${cursor}% ${end}%`);
    cursor = end;
  }
  stops.push(`var(--surface-3) ${cursor}% 100%`);

  const scoreColor =
    overall >= 80 ? "text-profit" : overall >= 60 ? "text-brand" : overall >= 40 ? "text-amber-400" : "text-loss";

  return (
    <Card className="card-hover h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Activity className="w-4 h-4 text-brand" />
          System Quality Score
        </CardTitle>
        <CardDescription>Live composite from discipline, execution &amp; risk data.</CardDescription>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="flex items-center justify-center py-4">
          <div className="relative w-40 h-40">
            <div
              className="absolute inset-0 rounded-full transition-all duration-1000 ease-out"
              style={{ background: `conic-gradient(${stops.join(", ")})` }}
            />
            <div className="absolute inset-[16px] rounded-full bg-surface flex items-center justify-center">
              <div className="text-center">
                <span className={cn("text-4xl font-extrabold font-mono tabular", scoreColor)}>
                  {overall}
                </span>
                <span className="text-[10px] text-foreground-subtle block">/ 100</span>
              </div>
            </div>
            <div
              className="absolute -inset-1 rounded-full opacity-25 blur-md pointer-events-none"
              style={{ background: `conic-gradient(${stops.slice(0, 3).join(", ")}, transparent ${cursor}%)` }}
            />
          </div>
        </div>

        <div className="space-y-2.5 text-xs">
          {segments.map((m) => (
            <div key={m.label} className="space-y-1">
              <div className="flex justify-between">
                <span className="text-foreground-subtle flex items-center gap-1.5">
                  <span className={cn("w-2 h-2 rounded-full", m.color)} />
                  {m.label}
                </span>
                <span className="font-mono font-bold tabular">{m.value}%</span>
              </div>
              <div className="h-1 rounded-full bg-surface-3 overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all duration-700 ease-out", m.color)}
                  style={{ width: `${m.value}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
