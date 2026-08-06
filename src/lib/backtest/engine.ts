/**
 * Velox Studio — Backtest Engine.
 *
 * Manages simulated trades against the synthetic OHLC series. Trades are
 * persisted to localStorage (keyed separately from the real Supabase journal)
 * so the live journal is never touched.
 *
 * Trade P&L and R-multiple reuse the same `computeRMultiple` logic as the
 * real journal, and the results flow through the same `calculateMetrics` +
 * `buildEquityCurve` so backtest analytics look identical to live analytics.
 */

import { computeRMultiple } from "../journal/types";
import type { Trade } from "../journal/types";

const STORAGE_KEY = "velox_backtest_trades";

// ────────────────────────────────────────────────────────────────
//  Types
// ────────────────────────────────────────────────────────────────

export type SimTradeStatus = "open" | "closed";

export interface SimTrade {
  id: string;
  symbol: string;
  direction: "LONG" | "SHORT";
  entryPrice: number;
  exitPrice: number | null;
  stopLoss: number | null;
  takeProfit: number | null;
  quantity: number;
  pnl: number | null;
  rMultiple: number | null;
  /** Candle index at entry. */
  entryCandleIndex: number;
  /** Candle index at exit (null if still open). */
  exitCandleIndex: number | null;
  status: SimTradeStatus;
  entryTime: string;
  exitTime: string | null;
  /** Pip/point value for P&L calc. */
  pipSize: number;
  /** Contract size ($ per pip per lot). */
  contractSize: number;
  notes: string | null;
}

// ────────────────────────────────────────────────────────────────
//  Persistence (localStorage)
// ────────────────────────────────────────────────────────────────

export function loadSimTrades(): SimTrade[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SimTrade[]) : [];
  } catch {
    return [];
  }
}

export function saveSimTrades(trades: SimTrade[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trades));
}

export function clearSimTrades(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

// ────────────────────────────────────────────────────────────────
//  Trade lifecycle
// ────────────────────────────────────────────────────────────────

export interface OpenTradeInput {
  symbol: string;
  direction: "LONG" | "SHORT";
  entryPrice: number;
  stopLoss: number | null;
  takeProfit: number | null;
  quantity: number;
  entryCandleIndex: number;
  entryTime: string;
  pipSize: number;
  contractSize: number;
}

/** Open a new simulated trade. */
export function openSimTrade(input: OpenTradeInput): SimTrade {
  return {
    id: `sim-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    symbol: input.symbol,
    direction: input.direction,
    entryPrice: input.entryPrice,
    exitPrice: null,
    stopLoss: input.stopLoss,
    takeProfit: input.takeProfit,
    quantity: input.quantity,
    pnl: null,
    rMultiple: null,
    entryCandleIndex: input.entryCandleIndex,
    exitCandleIndex: null,
    status: "open",
    entryTime: input.entryTime,
    exitTime: null,
    pipSize: input.pipSize,
    contractSize: input.contractSize,
    notes: null,
  };
}

/**
 * Check an open trade against the current candle — auto-close if SL/TP hit.
 * Returns the updated trade (closed) or the original (still open).
 */
export function checkSimTradeAgainstCandle(
  trade: SimTrade,
  candleHigh: number,
  candleLow: number,
  currentCandleIndex: number,
  currentTime: string,
): SimTrade {
  if (trade.status !== "open") return trade;

  // For LONG: stop loss hit if low <= SL; take profit hit if high >= TP.
  // For SHORT: stop loss hit if high >= SL; take profit hit if low <= TP.
  let hitStop = false;
  let hitTarget = false;

  if (trade.direction === "LONG") {
    if (trade.stopLoss != null && candleLow <= trade.stopLoss) hitStop = true;
    if (trade.takeProfit != null && candleHigh >= trade.takeProfit) hitTarget = true;
  } else {
    if (trade.stopLoss != null && candleHigh >= trade.stopLoss) hitStop = true;
    if (trade.takeProfit != null && candleLow <= trade.takeProfit) hitTarget = true;
  }

  // If both hit in the same candle, assume the stop hit first (pessimistic).
  if (hitStop) {
    return closeSimTrade(trade, trade.stopLoss!, currentCandleIndex, currentTime);
  }
  if (hitTarget) {
    return closeSimTrade(trade, trade.takeProfit!, currentCandleIndex, currentTime);
  }

  return trade;
}

/** Manually close a trade at the given exit price. */
export function closeSimTrade(
  trade: SimTrade,
  exitPrice: number,
  exitCandleIndex: number,
  exitTime: string,
): SimTrade {
  const pnl = computeSimPnl(trade, exitPrice);
  const rMultiple = computeRMultiple(
    trade.entryPrice,
    trade.stopLoss,
    exitPrice,
    trade.direction,
  );
  return {
    ...trade,
    exitPrice,
    pnl,
    rMultiple,
    exitCandleIndex,
    exitTime,
    status: "closed",
  };
}

/** Compute P&L for a sim trade. Uses pip-based contract sizing. */
export function computeSimPnl(trade: SimTrade, exitPrice: number): number {
  const priceDiff =
    trade.direction === "LONG"
      ? exitPrice - trade.entryPrice
      : trade.entryPrice - exitPrice;
  const pips = priceDiff / trade.pipSize;
  return Math.round(pips * trade.contractSize * trade.quantity * 100) / 100;
}

/** Compute unrealized P&L at a given price (for live display). */
export function unrealizedPnl(trade: SimTrade, currentPrice: number): number {
  return computeSimPnl(trade, currentPrice);
}

// ────────────────────────────────────────────────────────────────
//  Convert SimTrades → Trade shape for the shared metrics engine
// ────────────────────────────────────────────────────────────────

export function simTradesToTrades(simTrades: SimTrade[]): Trade[] {
  return simTrades
    .filter((t) => t.status === "closed")
    .map((t) => ({
      id: t.id,
      user_id: "backtest",
      symbol: t.symbol,
      direction: t.direction,
      entry_price: t.entryPrice,
      exit_price: t.exitPrice,
      stop_loss: t.stopLoss,
      take_profit: t.takeProfit,
      quantity: t.quantity,
      pnl: t.pnl,
      r_multiple: t.rMultiple,
      mae: null,
      mfe: null,
      setup: "Backtest",
      session: null,
      market_condition: null,
      confidence: null,
      emotion_before: null,
      emotion_after: null,
      mistakes: null,
      partials: null,
      confluences: null,
      notes: t.notes,
      status: "closed",
      entry_time: t.entryTime,
      exit_time: t.exitTime,
      created_at: t.entryTime,
      updated_at: t.exitTime ?? t.entryTime,
    }));
}
