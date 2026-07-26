"use client";

import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import type { Trade } from "@/lib/journal/types";
import { buildCalendar, type CalendarDay } from "@/lib/journal/metrics";

/* ─── helpers ─────────────────────────────────────────────────── */

const DOW_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function ymd(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Return all calendar day cells for a given month (including leading/trailing blanks). */
function buildMonthGrid(year: number, month: number): (string | null)[] {
  const firstDay = new Date(year, month, 1);
  // getDay() returns 0=Sun … 6=Sat; we want Mon=0
  const startOffset = (firstDay.getDay() + 6) % 7; // Mon-based offset
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (string | null)[] = Array(startOffset).fill(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(ymd(year, month, d));
  }
  // Pad to full weeks
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

/* ─── Main component ──────────────────────────────────────────── */

export function TradingCalendar({ trades }: { trades: Trade[] }) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const calendarMap = useMemo(() => buildCalendar(trades), [trades]);

  const cells = useMemo(() => buildMonthGrid(year, month), [year, month]);

  // Monthly summary
  const monthlySummary = useMemo(() => {
    const prefix = `${year}-${String(month + 1).padStart(2, "0")}`;
    let pnl = 0, winDays = 0, lossDays = 0, totalTrades = 0;
    for (const [date, day] of calendarMap.entries()) {
      if (!date.startsWith(prefix)) continue;
      pnl += day.pnl;
      totalTrades += day.trades;
      if (day.pnl > 0) winDays++;
      else if (day.pnl < 0) lossDays++;
    }
    return { pnl, winDays, lossDays, totalTrades };
  }, [calendarMap, year, month]);

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }
  function goToday() {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
  }

  const tradesForSelected = useMemo(() => {
    if (!selectedDate) return [];
    return trades.filter(t => {
      const d = (t.exit_time ?? t.entry_time).slice(0, 10);
      return d === selectedDate && t.status === "closed";
    });
  }, [trades, selectedDate]);

  return (
    <>
      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-brand" />
            <h2 className="text-base font-semibold">Trading Calendar</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={prevMonth}
              className="p-1.5 rounded-md hover:bg-surface-2 transition-colors text-foreground-muted hover:text-foreground"
              title="Previous month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-semibold min-w-[130px] text-center">
              {MONTH_NAMES[month]} {year}
            </span>
            <button
              onClick={nextMonth}
              className="p-1.5 rounded-md hover:bg-surface-2 transition-colors text-foreground-muted hover:text-foreground"
              title="Next month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <Button variant="ghost" size="sm" onClick={goToday} className="text-xs h-7">
              Today
            </Button>
          </div>
        </div>

        {/* ── Monthly Summary Bar ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border border-b border-border">
          {[
            {
              label: "Monthly P&L",
              value: formatCurrency(monthlySummary.pnl, { sign: true }),
              className: cn(
                "font-bold",
                monthlySummary.pnl > 0 ? "text-profit" : monthlySummary.pnl < 0 ? "text-loss" : "text-foreground"
              ),
            },
            {
              label: "Win Days",
              value: String(monthlySummary.winDays),
              className: "text-profit font-bold",
            },
            {
              label: "Loss Days",
              value: String(monthlySummary.lossDays),
              className: "text-loss font-bold",
            },
            {
              label: "Total Trades",
              value: String(monthlySummary.totalTrades),
              className: "text-foreground font-bold",
            },
          ].map((s) => (
            <div key={s.label} className="bg-surface-2/60 px-4 py-2.5 text-center">
              <p className="text-[10px] uppercase tracking-wider text-foreground-subtle">{s.label}</p>
              <p className={cn("text-sm tabular mt-0.5", s.className)}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* ── Day-of-week header ── */}
        <div className="grid grid-cols-7 bg-surface-2/30">
          {DOW_LABELS.map((d) => (
            <div key={d} className="py-2 text-center text-[11px] font-medium uppercase tracking-wider text-foreground-subtle">
              {d}
            </div>
          ))}
        </div>

        {/* ── Calendar Grid ── */}
        <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-border/40">
          {cells.map((date, i) => {
            if (!date) {
              return <div key={`blank-${i}`} className="min-h-[72px] bg-surface/30" />;
            }

            const day = calendarMap.get(date);
            const todayStr = today.toISOString().slice(0, 10);
            const isToday = date === todayStr;
            const dayNum = parseInt(date.slice(8), 10);

            return (
              <DayCell
                key={date}
                date={date}
                dayNum={dayNum}
                day={day}
                isToday={isToday}
                onClick={() => setSelectedDate(date)}
              />
            );
          })}
        </div>
      </div>

      {/* ── Day Drill-Down Modal ── */}
      {selectedDate && (
        <DayModal
          date={selectedDate}
          trades={tradesForSelected}
          onClose={() => setSelectedDate(null)}
        />
      )}
    </>
  );
}

/* ─── Day Cell ────────────────────────────────────────────────── */

function DayCell({
  date,
  dayNum,
  day,
  isToday,
  onClick,
}: {
  date: string;
  dayNum: number;
  day: CalendarDay | undefined;
  isToday: boolean;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  const hasTrades = !!day && day.trades > 0;
  const isWin = hasTrades && day.pnl > 0;
  const isLoss = hasTrades && day.pnl < 0;
  const winRate = hasTrades ? ((day.wins / day.trades) * 100).toFixed(0) : null;

  return (
    <div
      className={cn(
        "relative min-h-[72px] p-2 cursor-default transition-all duration-100 group",
        hasTrades && "cursor-pointer hover:ring-1 hover:ring-inset hover:ring-border-strong",
        isWin && "bg-profit/[0.04]",
        isLoss && "bg-loss/[0.04]",
        !hasTrades && "bg-surface",
        isToday && "ring-1 ring-inset ring-brand/40",
      )}
      onClick={hasTrades ? onClick : undefined}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Date number */}
      <div className="flex items-start justify-between">
        <span
          className={cn(
            "text-xs font-medium leading-none",
            isToday
              ? "bg-brand text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px]"
              : hasTrades
                ? "text-foreground"
                : "text-foreground-subtle",
          )}
        >
          {dayNum}
        </span>
        {hasTrades && (
          <span className={cn(
            "text-[9px] font-medium px-1 py-0.5 rounded-sm leading-none",
            isWin ? "bg-profit/15 text-profit" : isLoss ? "bg-loss/15 text-loss" : "bg-surface-3 text-foreground-subtle"
          )}>
            {day.trades}T
          </span>
        )}
      </div>

      {/* P&L */}
      {hasTrades && (
        <p className={cn(
          "mt-1.5 text-[11px] font-bold tabular leading-none",
          isWin ? "text-profit" : "text-loss",
        )}>
          {day.pnl > 0 ? "+" : ""}{formatCurrency(day.pnl)}
        </p>
      )}

      {/* Hover Tooltip */}
      {hasTrades && hovered && (
        <div className={cn(
          "absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-40",
          "rounded-lg border border-border bg-surface-2 shadow-xl p-2.5 text-xs",
          "pointer-events-none animate-fade-in",
        )}>
          <p className="font-semibold text-foreground mb-1.5">{formatDate(date)}</p>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-foreground-muted">Win Rate</span>
              <span className="font-medium">{winRate}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-foreground-muted">Trades</span>
              <span className="font-medium">{day.trades}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-foreground-muted">Net P&L</span>
              <span className={cn("font-bold tabular", isWin ? "text-profit" : "text-loss")}>
                {day.pnl > 0 ? "+" : ""}{formatCurrency(day.pnl)}
              </span>
            </div>
          </div>
          {/* Tooltip arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-border" />
        </div>
      )}
    </div>
  );
}

/* ─── Day Drill-Down Modal ────────────────────────────────────── */

function DayModal({
  date,
  trades,
  onClose,
}: {
  date: string;
  trades: Trade[];
  onClose: () => void;
}) {
  return (
    <Modal open onClose={onClose} title={`Trades for ${formatDate(date)}`}>
      {trades.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-sm text-foreground-muted">No closed trades on this day.</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
          {trades.map((t) => (
            <div
              key={t.id}
              className="rounded-lg border border-border bg-surface-2/50 px-4 py-3 space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge
                    variant={t.direction === "LONG" ? "profit" : "loss"}
                    className="text-[10px]"
                  >
                    {t.direction}
                  </Badge>
                  <span className="font-semibold text-sm">{t.symbol}</span>
                  {t.setup && (
                    <span className="text-[10px] text-foreground-subtle bg-surface-3 px-1.5 py-0.5 rounded">
                      {t.setup}
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <p
                    className={cn(
                      "text-sm font-bold tabular",
                      (t.pnl ?? 0) > 0 ? "text-profit" : "text-loss",
                    )}
                  >
                    {(t.pnl ?? 0) > 0 ? "+" : ""}
                    {formatCurrency(t.pnl ?? 0)}
                  </p>
                  {t.r_multiple != null && (
                    <p className={cn(
                      "text-[10px] tabular",
                      t.r_multiple >= 0 ? "text-profit" : "text-loss"
                    )}>
                      {t.r_multiple > 0 ? "+" : ""}{t.r_multiple.toFixed(2)}R
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs text-foreground-subtle">
                <span>Entry: <span className="tabular text-foreground">{t.entry_price}</span></span>
                {t.exit_price && (
                  <span>Exit: <span className="tabular text-foreground">{t.exit_price}</span></span>
                )}
                {t.quantity && (
                  <span>Lots: <span className="tabular text-foreground">{t.quantity}</span></span>
                )}
                {t.session && <span className="ml-auto">{t.session}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

/* ─── Util ────────────────────────────────────────────────────── */

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("en-US", { weekday: "short", month: "long", day: "numeric", year: "numeric" });
}
