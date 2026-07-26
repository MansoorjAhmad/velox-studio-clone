"use client";

import { cn, formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Trade } from "@/lib/journal/types";
import {
  X,
  TrendingUp,
  TrendingDown,
  Calendar,
  Clock,
  Tag,
  Brain,
  StickyNote,
  Target,
  Pencil,
  Trash2,
  ChevronRight,
} from "lucide-react";

interface TradeDetailDrawerProps {
  trade: Trade | null;
  onClose: () => void;
  onEdit: (trade: Trade) => void;
  onDelete: (trade: Trade) => void;
}

export function TradeDetailDrawer({
  trade,
  onClose,
  onEdit,
  onDelete,
}: TradeDetailDrawerProps) {
  const isOpen = !!trade;

  if (!trade) return null;

  const pnlPositive = (trade.pnl ?? 0) > 0;
  const pnlNegative = (trade.pnl ?? 0) < 0;
  const isLong = trade.direction === "LONG";

  const entryDate = new Date(trade.entry_time);
  const exitDate = trade.exit_time ? new Date(trade.exit_time) : null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div
        className={cn(
          "fixed right-0 top-0 z-50 h-full w-full max-w-md bg-surface border-l border-border shadow-2xl",
          "flex flex-col transition-transform duration-300 ease-out",
          isOpen ? "translate-x-0" : "translate-x-full",
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "w-9 h-9 rounded-lg flex items-center justify-center",
                isLong ? "bg-profit/15" : "bg-loss/15",
              )}
            >
              {isLong ? (
                <TrendingUp className={cn("w-5 h-5", "text-profit")} />
              ) : (
                <TrendingDown className="w-5 h-5 text-loss" />
              )}
            </div>
            <div>
              <p className="font-bold text-base tabular">{trade.symbol}</p>
              <p className="text-xs text-foreground-subtle">
                {entryDate.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-surface-2 text-foreground-subtle hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
          {/* P&L Hero */}
          <div className="px-5 py-5 border-b border-border bg-surface-2/40">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-foreground-subtle mb-1">
                  Realized P&L
                </p>
                <p
                  className={cn(
                    "text-4xl font-black tabular leading-none",
                    pnlPositive && "text-profit",
                    pnlNegative && "text-loss",
                    !pnlPositive && !pnlNegative && "text-foreground",
                  )}
                >
                  {trade.pnl != null
                    ? formatCurrency(trade.pnl, { sign: true })
                    : "—"}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Badge variant={isLong ? "profit" : "loss"}>
                  {isLong ? "LONG" : "SHORT"}
                </Badge>
                {trade.r_multiple != null && (
                  <span
                    className={cn(
                      "text-sm font-bold tabular",
                      trade.r_multiple >= 0 ? "text-profit" : "text-loss",
                    )}
                  >
                    {trade.r_multiple > 0 ? "+" : ""}
                    {trade.r_multiple.toFixed(2)}R
                  </span>
                )}
                <Badge
                  variant={
                    trade.status === "closed"
                      ? pnlPositive
                        ? "profit"
                        : "loss"
                      : "outline"
                  }
                  className="text-[10px]"
                >
                  {trade.status.toUpperCase()}
                </Badge>
              </div>
            </div>
          </div>

          <div className="px-5 py-4 space-y-5">
            {/* Price grid */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-foreground-subtle mb-2.5">
                Price Levels
              </p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Entry", value: trade.entry_price?.toFixed(5) },
                  { label: "Exit", value: trade.exit_price?.toFixed(5) ?? "—" },
                  { label: "Stop Loss", value: trade.stop_loss?.toFixed(5) ?? "—" },
                  { label: "Take Profit", value: trade.take_profit?.toFixed(5) ?? "—" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-lg bg-surface-2 border border-border px-3 py-2.5"
                  >
                    <p className="text-[10px] text-foreground-subtle mb-0.5">
                      {item.label}
                    </p>
                    <p className="text-sm font-bold tabular text-foreground">
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Timing */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-foreground-subtle mb-2.5">
                Timing
              </p>
              <div className="space-y-1.5 text-sm">
                <div className="flex items-center gap-2 text-foreground-muted">
                  <Calendar className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    Entry:{" "}
                    <span className="text-foreground font-medium">
                      {entryDate.toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </span>
                </div>
                {exitDate && (
                  <div className="flex items-center gap-2 text-foreground-muted">
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      Exit:{" "}
                      <span className="text-foreground font-medium">
                        {exitDate.toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Classification */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-foreground-subtle mb-2.5">
                Classification
              </p>
              <div className="flex flex-wrap gap-2">
                {trade.setup && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-brand/10 border border-brand/20 text-brand px-2.5 py-1 text-xs font-medium">
                    <Target className="w-3 h-3" />
                    {trade.setup}
                  </span>
                )}
                {trade.session && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-info/10 border border-info/20 text-info px-2.5 py-1 text-xs font-medium">
                    <Clock className="w-3 h-3" />
                    {trade.session}
                  </span>
                )}
                {trade.market_condition && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-surface-3 border border-border text-foreground-muted px-2.5 py-1 text-xs font-medium">
                    {trade.market_condition}
                  </span>
                )}
              </div>
            </div>

            {/* Confluences */}
            {trade.confluences && trade.confluences.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-foreground-subtle mb-2.5 flex items-center gap-1.5">
                  <Tag className="w-3 h-3" />
                  Confluences
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {trade.confluences.map((c) => (
                    <span
                      key={c}
                      className="rounded-md bg-warning/10 border border-warning/25 text-warning px-2 py-0.5 text-xs font-medium"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Psychology */}
            {(trade.confidence ||
              (trade.emotion_before && trade.emotion_before.length > 0) ||
              (trade.emotion_after && trade.emotion_after.length > 0) ||
              (trade.mistakes && trade.mistakes.length > 0)) && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-foreground-subtle mb-2.5 flex items-center gap-1.5">
                  <Brain className="w-3 h-3" />
                  Psychology
                </p>
                <div className="space-y-2.5">
                  {trade.confidence != null && (
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-foreground-muted">Confidence</span>
                        <span className="font-semibold">{trade.confidence}/10</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-surface-3 overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            trade.confidence >= 7
                              ? "bg-profit"
                              : trade.confidence >= 4
                                ? "bg-warning"
                                : "bg-loss",
                          )}
                          style={{ width: `${(trade.confidence / 10) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}
                  {trade.emotion_before && trade.emotion_before.length > 0 && (
                    <div>
                      <p className="text-xs text-foreground-subtle mb-1">Before</p>
                      <div className="flex flex-wrap gap-1">
                        {trade.emotion_before.map((e) => (
                          <span
                            key={e}
                            className="text-[10px] bg-surface-3 border border-border rounded px-1.5 py-0.5 text-foreground-muted capitalize"
                          >
                            {e}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {trade.emotion_after && trade.emotion_after.length > 0 && (
                    <div>
                      <p className="text-xs text-foreground-subtle mb-1">After</p>
                      <div className="flex flex-wrap gap-1">
                        {trade.emotion_after.map((e) => (
                          <span
                            key={e}
                            className="text-[10px] bg-surface-3 border border-border rounded px-1.5 py-0.5 text-foreground-muted capitalize"
                          >
                            {e}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {trade.mistakes && trade.mistakes.length > 0 && (
                    <div>
                      <p className="text-xs text-foreground-subtle mb-1">Mistakes</p>
                      <div className="flex flex-wrap gap-1">
                        {trade.mistakes.map((m) => (
                          <span
                            key={m}
                            className="text-[10px] bg-loss/10 border border-loss/20 rounded px-1.5 py-0.5 text-loss"
                          >
                            {m}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Partials */}
            {trade.partials && trade.partials.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-foreground-subtle mb-2.5">
                  Partial Exits
                </p>
                <div className="rounded-lg border border-border overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-surface-2 text-foreground-subtle border-b border-border">
                        <th className="text-left px-3 py-2 font-medium">#</th>
                        <th className="text-right px-3 py-2 font-medium">Price</th>
                        <th className="text-right px-3 py-2 font-medium">Lots</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trade.partials.map((p, i) => (
                        <tr key={i} className="border-t border-border/50">
                          <td className="px-3 py-2 text-foreground-subtle">{i + 1}</td>
                          <td className="px-3 py-2 text-right tabular font-medium">{p.price}</td>
                          <td className="px-3 py-2 text-right tabular">{p.lots}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Notes */}
            {trade.notes && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-foreground-subtle mb-2.5 flex items-center gap-1.5">
                  <StickyNote className="w-3 h-3" />
                  Notes
                </p>
                <div className="rounded-lg bg-surface-2 border border-border px-3 py-2.5 text-sm text-foreground-muted leading-relaxed whitespace-pre-wrap">
                  {trade.notes}
                </div>
              </div>
            )}

            {/* Quantity */}
            <div className="flex items-center justify-between text-xs text-foreground-subtle pt-1 border-t border-border">
              <span>Quantity / Lots</span>
              <span className="font-mono font-semibold text-foreground">{trade.quantity}</span>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="border-t border-border px-5 py-4 flex items-center gap-2 shrink-0 bg-surface">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onEdit(trade)}
            className="flex-1"
          >
            <Pencil className="w-3.5 h-3.5" />
            Edit Trade
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() => onDelete(trade)}
            className="flex-1"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete
          </Button>
        </div>
      </div>
    </>
  );
}
