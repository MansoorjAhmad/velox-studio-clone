import type { Trade } from "./types";

/** A single closed trade with a known P&L. */
type ClosedTrade = Trade & { pnl: number };

const isClosed = (t: Trade): t is ClosedTrade =>
  t.status === "closed" && typeof t.pnl === "number";

// ────────────────────────────────────────────────────────────────
//  CORE METRICS
// ────────────────────────────────────────────────────────────────

export interface Metrics {
  totalTrades: number;
  closedTrades: number;
  openTrades: number;
  wins: number;
  losses: number;
  breakevens: number;
  winRate: number;          // 0..1
  lossRate: number;         // 0..1
  grossProfit: number;
  grossLoss: number;        // positive number
  netPnl: number;
  profitFactor: number;     // grossProfit / grossLoss
  expectancy: number;       // avg $ per trade
  avgWin: number;
  avgLoss: number;          // negative number
  avgRMultiple: number;
  bestTrade: number;
  worstTrade: number;
  maxWinStreak: number;
  maxLossStreak: number;
  avgHoldMinutes: number;
}

export function calculateMetrics(trades: Trade[]): Metrics {
  const closed = trades.filter(isClosed).sort(
    (a, b) =>
      new Date(a.exit_time ?? a.entry_time).getTime() -
      new Date(b.exit_time ?? b.entry_time).getTime(),
  );

  const wins = closed.filter((t) => t.pnl > 0);
  const losses = closed.filter((t) => t.pnl < 0);
  const breakevens = closed.filter((t) => t.pnl === 0);

  const grossProfit = wins.reduce((s, t) => s + t.pnl, 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.pnl, 0));
  const netPnl = grossProfit - grossLoss;

  // Streaks — iterate in chronological order.
  let maxWinStreak = 0;
  let maxLossStreak = 0;
  let curWin = 0;
  let curLoss = 0;
  for (const t of closed) {
    if (t.pnl > 0) {
      curWin++;
      curLoss = 0;
      maxWinStreak = Math.max(maxWinStreak, curWin);
    } else if (t.pnl < 0) {
      curLoss++;
      curWin = 0;
      maxLossStreak = Math.max(maxLossStreak, curLoss);
    } else {
      curWin = 0;
      curLoss = 0;
    }
  }

  // Average hold time (minutes).
  const holdTimes = closed
    .filter((t) => t.exit_time)
    .map((t) =>
      (new Date(t.exit_time!).getTime() - new Date(t.entry_time).getTime()) /
      60000,
    );
  const avgHoldMinutes =
    holdTimes.length > 0
      ? holdTimes.reduce((s, x) => s + x, 0) / holdTimes.length
      : 0;

  // Average R-multiple.
  const rValues = closed
    .map((t) => t.r_multiple)
    .filter((r): r is number => r != null);
  const avgRMultiple =
    rValues.length > 0
      ? rValues.reduce((s, r) => s + r, 0) / rValues.length
      : 0;

  return {
    totalTrades: trades.length,
    closedTrades: closed.length,
    openTrades: trades.filter((t) => t.status === "open").length,
    wins: wins.length,
    losses: losses.length,
    breakevens: breakevens.length,
    winRate: closed.length > 0 ? wins.length / closed.length : 0,
    lossRate: closed.length > 0 ? losses.length / closed.length : 0,
    grossProfit,
    grossLoss,
    netPnl,
    profitFactor: grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0,
    expectancy: closed.length > 0 ? netPnl / closed.length : 0,
    avgWin: wins.length > 0 ? grossProfit / wins.length : 0,
    avgLoss: losses.length > 0 ? -grossLoss / losses.length : 0,
    avgRMultiple,
    bestTrade: closed.length > 0 ? Math.max(...closed.map((t) => t.pnl)) : 0,
    worstTrade: closed.length > 0 ? Math.min(...closed.map((t) => t.pnl)) : 0,
    maxWinStreak,
    maxLossStreak,
    avgHoldMinutes,
  };
}

// ────────────────────────────────────────────────────────────────
//  EQUITY CURVE — cumulative P&L over time, for charts.
// ────────────────────────────────────────────────────────────────

export interface EquityPoint {
  index: number;
  date: string;
  pnl: number;
  equity: number; // cumulative
}

export function buildEquityCurve(trades: Trade[]): EquityPoint[] {
  const closed = trades
    .filter(isClosed)
    .sort(
      (a, b) =>
        new Date(a.exit_time ?? a.entry_time).getTime() -
        new Date(b.exit_time ?? b.entry_time).getTime(),
    );

  let cumulative = 0;
  return closed.map((t, i) => {
    cumulative += t.pnl;
    return {
      index: i + 1,
      date: (t.exit_time ?? t.entry_time).slice(0, 10),
      pnl: t.pnl,
      equity: cumulative,
    };
  });
}

// ────────────────────────────────────────────────────────────────
//  DRAWDOWN — peak-to-trough decline of the equity curve.
// ────────────────────────────────────────────────────────────────

export interface DrawdownResult {
  maxDrawdown: number;     // absolute $ value
  maxDrawdownPct: number;  // 0..1
}

// Worked example (verified):
//   equity curve: 100, 120, 90, 110, 70
//   - peak tracks running max: 100, 120, 120, 120, 120
//   - dd (peak - equity):       0,   0,  30,  10,  50
//   - maxDd = 50, maxDdPct = 50/120 = 0.4167  ✅ correct
//
// The % is always computed relative to peak equity (not balance), and
// guarded against peak ≤ 0 so early-account drawdowns don't divide by 0.
export function calculateDrawdown(
  trades: Trade[],
  startingBalance = 0,
): DrawdownResult {
  const curve = buildEquityCurve(trades);
  if (curve.length === 0) return { maxDrawdown: 0, maxDrawdownPct: 0 };

  // Seed peak with the starting balance so the % is meaningful from
  // trade #1 (otherwise the first equity point is treated as the peak
  // and a losing first trade would show a misleading ~100% drawdown).
  let peak = Math.max(startingBalance, curve[0].equity);
  let maxDd = 0;
  let maxDdPct = 0;

  for (const point of curve) {
    if (point.equity > peak) peak = point.equity;
    const dd = peak - point.equity;
    if (dd > maxDd) {
      maxDd = dd;
      maxDdPct = peak > 0 ? dd / peak : 0;
    }
  }

  return { maxDrawdown: maxDd, maxDrawdownPct: maxDdPct };
}

// ────────────────────────────────────────────────────────────────
//  BREAKDOWNS — group trades by a key and compute metrics per group.
// ────────────────────────────────────────────────────────────────

export interface BreakdownRow {
  key: string;
  trades: number;
  winRate: number;
  netPnl: number;
  avgR: number;
}

export function breakdownBy(
  trades: Trade[],
  keyFn: (t: Trade) => string | null,
): BreakdownRow[] {
  const groups = new Map<string, Trade[]>();

  for (const t of trades) {
    if (!isClosed(t)) continue;
    const key = keyFn(t);
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(t);
  }

  return Array.from(groups.entries())
    .map(([key, group]) => {
      const m = calculateMetrics(group);
      return {
        key,
        trades: m.closedTrades,
        winRate: m.winRate,
        netPnl: m.netPnl,
        avgR: m.avgRMultiple,
      };
    })
    .sort((a, b) => b.netPnl - a.netPnl);
}

export const breakdownBySetup = (trades: Trade[]) =>
  breakdownBy(trades, (t) => t.setup);

export const breakdownBySession = (trades: Trade[]) =>
  breakdownBy(trades, (t) => t.session);

export const breakdownBySymbol = (trades: Trade[]) =>
  breakdownBy(trades, (t) => t.symbol);

export const breakdownByDirection = (trades: Trade[]) =>
  breakdownBy(trades, (t) => t.direction);

// ────────────────────────────────────────────────────────────────
//  CALENDAR — daily P&L for heatmap-style views.
// ────────────────────────────────────────────────────────────────

export interface CalendarDay {
  date: string;       // YYYY-MM-DD
  pnl: number;
  trades: number;
  wins: number;
}

export function buildCalendar(trades: Trade[]): Map<string, CalendarDay> {
  const days = new Map<string, CalendarDay>();

  for (const t of trades) {
    if (!isClosed(t)) continue;
    const date = (t.exit_time ?? t.entry_time).slice(0, 10);
    const existing = days.get(date) ?? {
      date,
      pnl: 0,
      trades: 0,
      wins: 0,
    };
    existing.pnl += t.pnl;
    existing.trades += 1;
    if (t.pnl > 0) existing.wins += 1;
    days.set(date, existing);
  }

  return days;
}

// ────────────────────────────────────────────────────────────────
//  STREAK (current) — today's running win/loss streak.
// ────────────────────────────────────────────────────────────────

export function currentStreak(trades: Trade[]): {
  type: "win" | "loss" | "none";
  count: number;
} {
  const closed = trades
    .filter(isClosed)
    .sort(
      (a, b) =>
        new Date(b.exit_time ?? b.entry_time).getTime() -
        new Date(a.exit_time ?? a.entry_time).getTime(),
    );

  if (closed.length === 0) return { type: "none", count: 0 };

  const last = closed[0];
  const type: "win" | "loss" = last.pnl >= 0 ? "win" : "loss";
  let count = 0;
  for (const t of closed) {
    if (type === "win" && t.pnl >= 0) count++;
    else if (type === "loss" && t.pnl < 0) count++;
    else break;
  }
  return { type, count };
}
