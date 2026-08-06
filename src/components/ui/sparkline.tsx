"use client";

/**
 * Sparkline — a tiny, borderless inline chart for showing a quick trend.
 * Used in KPI tiles, streak trackers, and dense data-dense layouts.
 *
 * Pass any single numeric dataKey. Positive/negative values auto-color
 * unless `color` is provided.
 */

import { cn } from "@/lib/utils";
import { ResponsiveContainer, AreaChart, Area, YAxis } from "recharts";

export interface SparklineProps {
  data: Record<string, number | string>[];
  dataKey: string;
  width?: number;
  height?: number;
  /** Force a color; otherwise auto from data trend. */
  color?: string;
  className?: string;
}

export function Sparkline({
  data,
  dataKey,
  width = 80,
  height = 28,
  color,
  className,
}: SparklineProps) {
  if (!data || data.length === 0) return null;

  // Auto-detect color from net trend if not provided.
  const values = data.map((d) => Number(d[dataKey]) || 0);
  const sum = values.reduce((a, b) => a + b, 0);
  const autoColor = color ?? (sum >= 0 ? "#34d399" : "#fb7185");
  const gradId = `spark-${dataKey}-${Math.round(sum)}-${data.length}`;

  return (
    <div className={cn("inline-block", className)} style={{ width, height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, bottom: 2, left: 0, right: 0 }}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={autoColor} stopOpacity={0.4} />
              <stop offset="100%" stopColor={autoColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <YAxis domain={["dataMin", "dataMax"]} hide />
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={autoColor}
            strokeWidth={1.5}
            fill={`url(#${gradId})`}
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
