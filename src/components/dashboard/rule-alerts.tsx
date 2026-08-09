"use client";

/**
 * RuleAlerts — renders the discipline violation feed from the Trader Index.
 * Used both inline on the dashboard and as a compact list on the Trader
 * Index page.
 */

import { motion, useReducedMotion } from "framer-motion";
import { AlertOctagon, AlertTriangle, Info, ShieldX } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { RuleAlert } from "@/lib/journal/trader-index";

interface RuleAlertsProps {
  alerts: RuleAlert[];
  compact?: boolean;
  maxItems?: number;
}

const SEVERITY_CONFIG = {
  critical: {
    icon: ShieldX,
    color: "text-loss",
    bg: "bg-loss/10",
    border: "border-loss/30",
    badge: "loss" as const,
    label: "Critical",
  },
  warning: {
    icon: AlertTriangle,
    color: "text-warning",
    bg: "bg-warning/10",
    border: "border-warning/30",
    badge: "warning" as const,
    label: "Warning",
  },
  info: {
    icon: Info,
    color: "text-info",
    bg: "bg-info/10",
    border: "border-info/30",
    badge: "info" as const,
    label: "Insight",
  },
};

export function RuleAlerts({ alerts, compact = false, maxItems = 8 }: RuleAlertsProps) {
  const reduce = useReducedMotion();
  const shown = alerts.slice(0, maxItems);

  if (alerts.length === 0) {
    return (
      <Card className="card-hover h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertOctagon className="w-4 h-4 text-profit" />
            Rule Adherence
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center border border-dashed border-profit/30 rounded-lg">
            <p className="text-sm font-semibold text-profit">No violations detected</p>
            <p className="text-xs text-foreground-muted mt-1">
              Your recent trades respect your risk rules. Keep it up.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-hover h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="flex items-center gap-2">
            <AlertOctagon className="w-4 h-4 text-loss" />
            Rule Violations
          </span>
          <Badge variant="loss" className="text-[10px]">{alerts.length}</Badge>
        </CardTitle>
        {!compact && (
          <CardDescription>Discipline alerts surfaced from your trade log.</CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-2 max-h-[420px] overflow-y-auto">
        {shown.map((alert, i) => {
          const cfg = SEVERITY_CONFIG[alert.severity];
          const Icon = cfg.icon;
          return (
            <motion.div
              key={alert.id}
              initial={reduce ? false : { opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.35, delay: i * 0.04, ease: [0.16, 1, 0.3, 1] }}
              className={cn("rounded-lg border p-3", cfg.border, cfg.bg)}
            >
              <div className="flex items-start gap-2.5">
                <Icon className={cn("w-4 h-4 shrink-0 mt-0.5", cfg.color)} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <p className="text-xs font-bold text-foreground leading-tight">{alert.title}</p>
                    <Badge variant={cfg.badge} className="text-[9px] shrink-0">{cfg.label}</Badge>
                  </div>
                  <p className="text-[11px] text-foreground-muted leading-relaxed">{alert.description}</p>
                  {alert.tradeRefs.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {alert.tradeRefs.slice(0, 3).map((ref, idx) => (
                        <span
                          key={idx}
                          className="text-[9px] font-mono text-foreground-subtle bg-surface-2 px-1.5 py-0.5 rounded"
                        >
                          {ref}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
        {alerts.length > maxItems && (
          <p className="text-center text-[10px] text-foreground-subtle pt-1">
            +{alerts.length - maxItems} more alerts
          </p>
        )}
      </CardContent>
    </Card>
  );
}
