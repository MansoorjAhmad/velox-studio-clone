"use client";

import { useMemo, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Flame,
  Target,
  RotateCcw,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import type { Trade } from "@/lib/journal/types";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

interface DayCell {
  dayNum: number;
  dateStr: string;
  data?: { pnl: number; count: number; wins: number; trades: Trade[] };
}

interface TradingCalendarWidgetProps {
  trades: Trade[];
}

export function TradingCalendarWidget({ trades }: TradingCalendarWidgetProps) {
  const todayStr = new Date().toISOString().split("T")[0];
  const [viewDate, setViewDate] = useState(() => new Date());
  const [selectedDayTrades, setSelectedDayTrades] = useState<Trade[] | null>(null);
  const [selectedDayStr, setSelectedDayStr] = useState("");

  // Hover tooltip state
  const [hoveredCell, setHoveredCell] = useState<{
    cell: DayCell;
    x: number;
    y: number;
    alignRight: boolean;
  } | null>(null);

  const handleMouseEnter = useCallback((e: React.MouseEvent<HTMLButtonElement>, cd: DayCell) => {
    if (!cd.data) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const alignRight = rect.right + 224 > window.innerWidth;
    setHoveredCell({
      cell: cd,
      x: alignRight ? rect.left - 8 : rect.right + 8,
      y: Math.min(rect.top, window.innerHeight - 200),
      alignRight,
    });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoveredCell(null);
  }, []);

  const calendarPnlMap = useMemo(() => {
    const map = new Map<string, { pnl: number; count: number; wins: number; trades: Trade[] }>();
    for (const t of trades) {
      if (!t.entry_time) continue;
      const day = t.entry_time.split("T")[0];
      const ex = map.get(day) ?? { pnl: 0, count: 0, wins: 0, trades: [] };
      map.set(day, {
        pnl: ex.pnl + (t.pnl ?? 0),
        count: ex.count + 1,
        wins: ex.wins + ((t.pnl ?? 0) > 0 ? 1 : 0),
        trades: [...ex.trades, t],
      });
    }
    return map;
  }, [trades]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const monthLabel = viewDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const isCurrentMonth = year === new Date().getFullYear() && month === new Date().getMonth();

  const calendarDays = useMemo(() => {
    const numDays = new Date(year, month + 1, 0).getDate();
    const firstDayOfWeek = new Date(year, month, 1).getDay();
    const offset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

    const cells: (DayCell | null)[] = [];
    for (let i = 0; i < offset; i++) cells.push(null);
    for (let d = 1; d <= numDays; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const raw = calendarPnlMap.get(dateStr);
      cells.push({
        dayNum: d,
        dateStr,
        data: raw ? { ...raw } : undefined,
      });
    }
    return cells;
  }, [year, month, calendarPnlMap]);

  const monthStats = useMemo(() => {
    const prefix = `${year}-${String(month + 1).padStart(2, "0")}`;
    let totalPnl = 0;
    let winDays = 0;
    let lossDays = 0;
    let flatDays = 0;
    let tradingDays = 0;
    let bestDay = 0;
    let worstDay = 0;
    let totalTrades = 0;
    let totalWins = 0;
    const dailySeries: { day: number; pnl: number; cumulative: number }[] = [];
    let cumulative = 0;

    const numDays = new Date(year, month + 1, 0).getDate();
    for (let d = 1; d <= numDays; d++) {
      const dateStr = `${prefix}-${String(d).padStart(2, "0")}`;
      const data = calendarPnlMap.get(dateStr);
      if (data) {
        tradingDays++;
        totalPnl += data.pnl;
        totalTrades += data.count;
        totalWins += data.wins;
        if (data.pnl > 0) winDays++;
        else if (data.pnl < 0) lossDays++;
        else flatDays++;
        if (data.pnl > bestDay) bestDay = data.pnl;
        if (data.pnl < worstDay) worstDay = data.pnl;
        cumulative += data.pnl;
      }
      dailySeries.push({ day: d, pnl: data?.pnl ?? 0, cumulative });
    }

    const maxAbsPnl = Math.max(
      ...Array.from(calendarPnlMap.values()).map((v) => Math.abs(v.pnl)),
      1,
    );

    const avgDailyPnl = tradingDays > 0 ? totalPnl / tradingDays : 0;
    const dayWinRate = tradingDays > 0 ? (winDays / tradingDays) * 100 : 0;
    const tradeWinRate = totalTrades > 0 ? (totalWins / totalTrades) * 100 : 0;

    // Current win-day streak within month
    let winDayStreak = 0;
    for (let d = numDays; d >= 1; d--) {
      const dateStr = `${prefix}-${String(d).padStart(2, "0")}`;
      const data = calendarPnlMap.get(dateStr);
      if (!data) continue;
      if (data.pnl > 0) winDayStreak++;
      else break;
    }

    return {
      totalPnl,
      winDays,
      lossDays,
      flatDays,
      tradingDays,
      bestDay,
      worstDay,
      maxAbsPnl,
      avgDailyPnl,
      dayWinRate,
      tradeWinRate,
      winDayStreak,
      dailySeries,
      totalTrades,
    };
  }, [calendarPnlMap, year, month]);

  const weekSummaries = useMemo(() => {
    const weeks: { label: string; pnl: number; days: number }[] = [];
    let weekPnl = 0;
    let weekDays = 0;
    let weekNum = 1;

    for (const cell of calendarDays) {
      if (cell === null) continue;
      if (cell.data) {
        weekPnl += cell.data.pnl;
        weekDays++;
      }
      const isEndOfWeek = cell.dayNum % 7 === 0 || cell.dayNum === calendarDays.filter(Boolean).length;
      if (isEndOfWeek) {
        weeks.push({ label: `W${weekNum}`, pnl: weekPnl, days: weekDays });
        weekPnl = 0;
        weekDays = 0;
        weekNum++;
      }
    }
    if (weekDays > 0) weeks.push({ label: `W${weekNum}`, pnl: weekPnl, days: weekDays });
    return weeks;
  }, [calendarDays]);

  const shiftMonth = (delta: number) => {
    setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + delta, 1));
  };

  const jumpToToday = () => setViewDate(new Date());

  const getHeatStyle = (pnl: number) => {
    const intensity = Math.min(1, Math.abs(pnl) / monthStats.maxAbsPnl);
    if (pnl > 0) {
      return {
        bg: `rgba(52, 211, 153, ${0.1 + intensity * 0.4})`,
        border: `rgba(52, 211, 153, ${0.3 + intensity * 0.5})`,
        glow: `0 0 ${8 + intensity * 12}px rgba(52, 211, 153, ${intensity * 0.25})`,
      };
    }
    if (pnl < 0) {
      return {
        bg: `rgba(251, 113, 133, ${0.1 + intensity * 0.4})`,
        border: `rgba(251, 113, 133, ${0.3 + intensity * 0.5})`,
        glow: `0 0 ${8 + intensity * 12}px rgba(251, 113, 133, ${intensity * 0.25})`,
      };
    }
    return { bg: undefined, border: undefined, glow: undefined };
  };

  return (
    <>
      <Card className="card-hover overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <CardTitle className="text-sm flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-brand" />
                Trading Calendar
                <Badge variant="brand" className="text-[9px] ml-1">Pro Heatmap</Badge>
              </CardTitle>
              <CardDescription>P&L intensity · cumulative curve · click any day for trade intel</CardDescription>
            </div>
            <div className="flex items-center gap-1">
              {!isCurrentMonth && (
                <Button size="sm" variant="ghost" className="h-7 px-2 text-[10px] gap-1" onClick={jumpToToday}>
                  <RotateCcw className="w-3 h-3" /> Today
                </Button>
              )}
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => shiftMonth(-1)}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Badge variant="outline" className="text-[10px] font-mono min-w-[130px] justify-center">
                {monthLabel}
              </Badge>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => shiftMonth(1)}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Month stats + cumulative sparkline */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
            <div className="lg:col-span-7 grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                {
                  label: "Month P&L",
                  value: `${monthStats.totalPnl >= 0 ? "+" : ""}${formatCurrency(monthStats.totalPnl)}`,
                  color: monthStats.totalPnl >= 0 ? "text-profit" : "text-loss",
                },
                {
                  label: "Avg / Day",
                  value: `${monthStats.avgDailyPnl >= 0 ? "+" : ""}${formatCurrency(monthStats.avgDailyPnl)}`,
                  color: monthStats.avgDailyPnl >= 0 ? "text-brand" : "text-loss",
                },
                {
                  label: "Day Win Rate",
                  value: `${monthStats.dayWinRate.toFixed(0)}%`,
                  color: "text-brand",
                },
                {
                  label: "Win Streak",
                  value: monthStats.winDayStreak > 0 ? `${monthStats.winDayStreak}d 🔥` : "—",
                  color: "text-amber-400",
                },
              ].map((s) => (
                <div key={s.label} className="p-2.5 rounded-lg border border-border bg-surface-2/40 text-center">
                  <p className="text-[8px] uppercase tracking-wider text-foreground-subtle font-bold">{s.label}</p>
                  <p className={cn("text-xs font-mono font-bold mt-0.5 tabular", s.color)}>{s.value}</p>
                </div>
              ))}
            </div>

            <div className="lg:col-span-5 h-16 rounded-lg border border-border bg-surface-2/30 p-2">
              <p className="text-[8px] uppercase tracking-wider text-foreground-subtle font-bold mb-1">Cumulative Month Curve</p>
              <ResponsiveContainer width="100%" height="85%">
                <AreaChart data={monthStats.dailySeries}>
                  <defs>
                    <linearGradient id="calCumGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--brand)" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="var(--brand)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" hide />
                  <YAxis hide domain={["auto", "auto"]} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "var(--surface)", borderColor: "var(--border)", borderRadius: "8px", fontSize: "10px", color: "var(--foreground)" }}
                    formatter={(val) => [formatCurrency(Number(val)), "Cumulative"]}
                    labelFormatter={(d) => `Day ${d}`}
                  />
                  <Area type="monotone" dataKey="cumulative" stroke="var(--brand)" strokeWidth={2} fill="url(#calCumGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Extended stats row */}
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
            {[
              { label: "Trading Days", value: `${monthStats.tradingDays}`, icon: Target },
              { label: "Win Days", value: `${monthStats.winDays}`, icon: TrendingUp, color: "text-profit" },
              { label: "Loss Days", value: `${monthStats.lossDays}`, icon: TrendingDown, color: "text-loss" },
              { label: "Best Day", value: `+${formatCurrency(monthStats.bestDay)}`, color: "text-profit" },
              { label: "Worst Day", value: formatCurrency(monthStats.worstDay), color: "text-loss" },
              { label: "Trade WR", value: `${monthStats.tradeWinRate.toFixed(0)}%`, color: "text-brand" },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-2 p-2 rounded-lg border border-border/60 bg-surface-2/20">
                {"icon" in s && s.icon && <s.icon className={cn("w-3 h-3 shrink-0", s.color ?? "text-foreground-subtle")} />}
                <div>
                  <p className="text-[7px] uppercase tracking-wider text-foreground-subtle font-bold">{s.label}</p>
                  <p className={cn("text-[10px] font-mono font-bold tabular", s.color ?? "text-foreground")}>{s.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Week summaries */}
          {weekSummaries.length > 0 && (
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {weekSummaries.map((w) => (
                <div
                  key={w.label}
                  className={cn(
                    "shrink-0 px-2.5 py-1.5 rounded-md border text-[10px] font-mono font-bold",
                    w.pnl >= 0 ? "border-profit/30 bg-profit/8 text-profit" : "border-loss/30 bg-loss/8 text-loss",
                  )}
                >
                  {w.label}: {w.pnl >= 0 ? "+" : ""}{formatCurrency(w.pnl)}
                  <span className="text-foreground-subtle font-normal ml-1">({w.days}d)</span>
                </div>
              ))}
            </div>
          )}

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 text-center text-[9px] font-bold text-foreground-subtle uppercase tracking-wider">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((cd, idx) => {
              if (cd === null) return <div key={`empty-${idx}`} className="h-[5rem]" />;
              const isToday = cd.dateStr === todayStr;
              const heat = cd.data ? getHeatStyle(cd.data.pnl) : null;
              const dayWr = cd.data && cd.data.count > 0 ? Math.round((cd.data.wins / cd.data.count) * 100) : null;

              return (
                <button
                  key={cd.dateStr}
                  type="button"
                  onMouseEnter={(e) => handleMouseEnter(e, cd)}
                  onMouseLeave={handleMouseLeave}
                  onClick={() => {
                    if (cd.data?.trades.length) {
                      setSelectedDayTrades(cd.data.trades);
                      setSelectedDayStr(cd.dateStr);
                    }
                  }}
                  className={cn(
                    "h-[5rem] rounded-lg border p-1.5 flex flex-col justify-between transition-all relative group",
                    "hover:scale-[1.05] hover:z-10 hover:shadow-xl hover:shadow-black/30",
                    isToday && "ring-2 ring-brand/70 ring-offset-1 ring-offset-surface",
                    !cd.data && "border-border/40 bg-surface-2/20 hover:border-border",
                    cd.data && "cursor-pointer",
                  )}
                  style={
                    heat?.bg
                      ? { backgroundColor: heat.bg, borderColor: heat.border, boxShadow: heat.glow }
                      : undefined
                  }
                >
                  <div className="flex items-center justify-between">
                    <span className={cn("text-[9px] font-mono font-bold", isToday ? "text-brand" : "text-foreground-subtle")}>
                      {cd.dayNum}
                    </span>
                    {cd.data && cd.data.pnl > 0 && monthStats.winDayStreak > 0 && cd.dateStr === todayStr && (
                      <Flame className="w-2.5 h-2.5 text-amber-400" />
                    )}
                    {cd.data && (
                      cd.data.pnl >= 0 ? (
                        <TrendingUp className="w-2.5 h-2.5 text-profit/70" />
                      ) : (
                        <TrendingDown className="w-2.5 h-2.5 text-loss/70" />
                      )
                    )}
                  </div>
                  {cd.data ? (
                    <div>
                      <span className={cn("text-[9px] font-mono font-extrabold block tabular leading-tight", cd.data.pnl >= 0 ? "text-profit" : "text-loss")}>
                        {cd.data.pnl >= 0 ? "+" : ""}
                        {formatCurrency(cd.data.pnl)}
                      </span>
                      <span className="text-[7px] text-foreground-subtle/90 block">
                        {cd.data.count}t · {dayWr}%
                      </span>
                    </div>
                  ) : (
                    <span className="text-[7px] text-foreground-subtle/40">—</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-4 text-[9px] text-foreground-subtle flex-wrap">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-profit/40 border border-profit/60" /> Profit day
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-loss/40 border border-loss/60" /> Loss day
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded border-2 border-brand/60 bg-surface-2/30" /> Today
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded border border-border bg-surface-2/30" /> No trades
            </span>
          </div>
        </CardContent>
      </Card>

      {selectedDayTrades && (
        <Modal open title={`Trades · ${selectedDayStr}`} onClose={() => setSelectedDayTrades(null)}>
          <div className="space-y-2.5">
            <div className="flex items-center justify-between p-2 rounded-lg bg-surface-2 border border-border text-xs">
              <span className="text-foreground-subtle">Day Total</span>
              <span
                className={cn(
                  "font-mono font-bold",
                  selectedDayTrades.reduce((s, t) => s + (t.pnl ?? 0), 0) >= 0 ? "text-profit" : "text-loss",
                )}
              >
                {formatCurrency(selectedDayTrades.reduce((s, t) => s + (t.pnl ?? 0), 0))}
              </span>
            </div>
            {selectedDayTrades.map((t) => (
              <div key={t.id} className="p-3 rounded-lg border border-border bg-surface-2 flex items-center justify-between text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm">{t.symbol}</span>
                    <Badge variant={t.direction === "LONG" ? "profit" : "loss"} className="text-[9px]">
                      {t.direction}
                    </Badge>
                    {t.setup && <Badge variant="outline" className="text-[9px]">{t.setup}</Badge>}
                  </div>
                  <p className="text-[10px] text-foreground-subtle mt-1">
                    Entry {t.entry_price} → Exit {t.exit_price ?? "open"}
                    {t.r_multiple != null && ` · ${t.r_multiple}R`}
                  </p>
                </div>
                <span className={cn("font-mono font-bold text-sm tabular", (t.pnl ?? 0) >= 0 ? "text-profit" : "text-loss")}>
                  {(t.pnl ?? 0) >= 0 ? "+" : ""}
                  {formatCurrency(t.pnl ?? 0)}
                </span>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {/* Hover tooltip — premium floating card */}
      {hoveredCell?.cell.data && (
        <div
          className="fixed z-50 pointer-events-none animate-fade-in"
          style={{
            left: hoveredCell.alignRight
              ? hoveredCell.x - 212
              : hoveredCell.x,
            top: hoveredCell.y,
          }}
        >
          <div className={cn(
            "w-52 rounded-xl border border-border/80 shadow-2xl shadow-black/50",
            "bg-surface/95 backdrop-blur-xl p-3.5",
          )}>
            {/* Date header */}
            <p className="text-[11px] font-semibold text-foreground-subtle mb-2.5 uppercase tracking-wider">
              {new Date(hoveredCell.cell.dateStr + "T00:00:00").toLocaleDateString("en-US", {
                weekday: "long",
                month: "short",
                day: "numeric",
              })}
            </p>

            {/* P&L — hero number */}
            <p className={cn(
              "text-xl font-extrabold font-mono tabular mb-2.5",
              hoveredCell.cell.data.pnl >= 0 ? "text-profit" : "text-loss",
            )}>
              {hoveredCell.cell.data.pnl >= 0 ? "+" : ""}
              {formatCurrency(hoveredCell.cell.data.pnl)}
            </p>

            {/* Divider */}
            <div className="h-px bg-border/60 mb-2.5" />

            {/* Stats grid */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-foreground-muted">Trades</span>
                <span className="font-mono font-bold text-foreground">{hoveredCell.cell.data.count}</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-foreground-muted">Win Rate</span>
                <span className="font-mono font-bold text-brand">
                  {hoveredCell.cell.data.count > 0
                    ? Math.round((hoveredCell.cell.data.wins / hoveredCell.cell.data.count) * 100)
                    : 0}%
                </span>
              </div>
              {(() => {
                const best = Math.max(...hoveredCell.cell.data.trades.map((t) => t.pnl ?? 0));
                const worst = Math.min(...hoveredCell.cell.data.trades.map((t) => t.pnl ?? 0));
                return (
                  <>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-foreground-muted">Best trade</span>
                      <span className="font-mono font-bold text-profit">+{formatCurrency(best)}</span>
                    </div>
                    {hoveredCell.cell.data.count > 1 && (
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-foreground-muted">Worst trade</span>
                        <span className={cn("font-mono font-bold", worst < 0 ? "text-loss" : "text-profit")}>
                          {worst >= 0 ? "+" : ""}{formatCurrency(worst)}
                        </span>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>

            {/* Click hint */}
            {hoveredCell.cell.data.count > 0 && (
              <p className="text-[9px] text-foreground-subtle/60 mt-2.5 pt-2 border-t border-border/40">
                Click to view trades
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
