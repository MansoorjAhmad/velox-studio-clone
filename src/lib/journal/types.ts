/**
 * Trade — the core domain type for the journal.
 * Mirrors the `trades` table columns in supabase/schema.sql.
 */
export interface Trade {
  id: string;
  user_id: string;

  // Core
  symbol: string;
  direction: "LONG" | "SHORT";
  entry_price: number;
  exit_price: number | null;
  stop_loss: number | null;
  take_profit: number | null;
  quantity: number;
  pnl: number | null;
  r_multiple: number | null;
  mae: number | null;
  mfe: number | null;

  // Classification
  setup: string | null;
  session: "Asia" | "London" | "New York" | "Other" | null;
  market_condition: string | null;

  // Psychology
  confidence: number | null; // 1-10
  emotion_before: string[] | null;
  emotion_after: string[] | null;
  mistakes: string[] | null;

  // Partials (multiple TP exits) — [{price, lots}]
  partials: { price: number; lots: number }[] | null;

  // Confluences
  confluences: string[] | null;

  // Meta
  notes: string | null;
  status: "open" | "closed" | "breakeven";

  // Timestamps
  entry_time: string;
  exit_time: string | null;
  created_at: string;
  updated_at: string;
}

/** Payload when creating/editing a trade (no server-generated fields). */
export type TradeInput = Omit<
  Trade,
  "id" | "user_id" | "created_at" | "updated_at"
>;

/** Common setups & emotions for quick tagging in the form.
 *  The user's actual strategies (ICT / SMC style). */
export const COMMON_SETUPS = [
  "TJL 1",
  "TJL 2 (A+)",
  "LEVEL 4",
  "QML",
  "DB / DT",
  "SBR / RBS",
] as const;

/** Confluence tags for the trade form. */
export const CONFLUENCE_TAGS = [
  "Fib Golden Zone",
  "FVG",
  "Liquidity Sweep",
] as const;

export const COMMON_EMOTIONS = [
  "calm",
  "confident",
  "patient",
  "focused",
  "anxious",
  "fomo",
  "greedy",
  "fearful",
  "revenge",
  "bored",
  "frustrated",
  "disciplined",
] as const;

export const COMMON_MISTAKES = [
  "Moved stop loss",
  "Oversized position",
  "Entered too early",
  "Entered too late",
  "Exited too early",
  "Exited too late",
  "Revenge trade",
  "Traded the news",
  "No setup",
  "Overtrading",
] as const;

export const SESSIONS = ["Asia", "London", "New York", "Other"] as const;

/** Compute R-multiple from entry, stop, exit, direction.
 *  Returns null if any required value is missing. */
export function computeRMultiple(
  entry: number,
  stop: number | null,
  exit: number | null,
  direction: "LONG" | "SHORT",
): number | null {
  if (stop == null || exit == null) return null;
  const risk = direction === "LONG" ? entry - stop : stop - entry;
  if (risk === 0) return null;
  const reward = direction === "LONG" ? exit - entry : entry - exit;
  return Math.round((reward / risk) * 100) / 100;
}

/**
 * Compute the volume-weighted average exit price from partial exits
 * plus (optionally) a final exit. Returns null if no usable rows.
 */
export function computeWeightedExit(
  partials: { price: number; lots: number }[],
  finalExitPrice: number | null,
  finalLots: number | null,
): number | null {
  let weightedSum = 0;
  let totalLots = 0;
  for (const p of partials) {
    if (p.lots > 0 && Number.isFinite(p.price)) {
      weightedSum += p.price * p.lots;
      totalLots += p.lots;
    }
  }
  if (finalExitPrice != null && finalLots != null && finalLots > 0) {
    weightedSum += finalExitPrice * finalLots;
    totalLots += finalLots;
  }
  if (totalLots === 0) return null;
  return Math.round((weightedSum / totalLots) * 100000) / 100000;
}
