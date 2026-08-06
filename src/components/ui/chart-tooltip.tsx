"use client";

/**
 * ChartTooltip — premium recharts custom tooltip.
 *
 * Replaces the default recharts tooltip with a glassmorphism card that:
 * - Has a dark, blurred background
 * - Color-codes profit (green) and loss (red) values
 * - Shows a colored dot matching the chart line color
 * - Has clean label typography
 * - Animates in with a subtle fade
 *
 * Usage in recharts:
 *   <Tooltip content={<ChartTooltip formatter={...} labelFormatter={...} />} />
 */

import { cn, formatCurrency } from "@/lib/utils";

interface ChartTooltipPayloadItem {
  name: string;
  value: number;
  color?: string;
  dataKey?: string;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: ChartTooltipPayloadItem[];
  label?: string | number;
  /** Custom label formatter */
  labelFormatter?: (label: string | number) => string;
  /** Custom value formatter — return [formattedValue, formattedName] */
  formatter?: (value: number, name: string) => [string, string];
  /** If true, colors the value green/red based on sign */
  colorBySign?: boolean;
  /** Hide the series name */
  hideName?: boolean;
  /** Currency mode — auto formats value as currency */
  currency?: boolean;
}

export function ChartTooltip({
  active,
  payload,
  label,
  labelFormatter,
  formatter,
  colorBySign = false,
  hideName = false,
  currency = false,
}: ChartTooltipProps) {
  if (!active || !payload?.length) return null;

  const formattedLabel = label != null
    ? (labelFormatter ? labelFormatter(label) : String(label))
    : null;

  return (
    <div
      className={cn(
        "min-w-[140px] rounded-xl border border-border/80 shadow-2xl shadow-black/40",
        "bg-surface/95 backdrop-blur-xl px-3.5 py-2.5",
        "animate-fade-in",
      )}
    >
      {formattedLabel && (
        <p className="text-[10px] font-semibold text-foreground-subtle mb-1.5 uppercase tracking-wider">
          {formattedLabel}
        </p>
      )}

      <div className="space-y-1">
        {payload.map((item, i) => {
          const raw = item.value;
          let displayValue: string;
          let displayName: string;

          if (formatter) {
            [displayValue, displayName] = formatter(raw, item.name);
          } else if (currency) {
            displayValue = formatCurrency(raw, { sign: true });
            displayName = item.name;
          } else {
            displayValue = typeof raw === "number" ? raw.toFixed(2) : String(raw);
            displayName = item.name;
          }

          const valueColor = colorBySign
            ? raw >= 0 ? "text-profit" : "text-loss"
            : "text-foreground";

          return (
            <div key={i} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5">
                {item.color && (
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                )}
                {!hideName && (
                  <span className="text-[11px] text-foreground-muted capitalize">
                    {displayName}
                  </span>
                )}
              </div>
              <span className={cn("text-[12px] font-bold font-mono tabular", valueColor)}>
                {displayValue}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Pre-configured tooltip for currency P&L charts */
export function PnlTooltip(props: ChartTooltipProps) {
  return <ChartTooltip {...props} currency colorBySign hideName />;
}

/** Pre-configured tooltip for percentage charts */
export function PctTooltip(props: ChartTooltipProps) {
  return (
    <ChartTooltip
      {...props}
      formatter={(v, n) => [`${v.toFixed(1)}%`, n]}
      colorBySign
    />
  );
}
