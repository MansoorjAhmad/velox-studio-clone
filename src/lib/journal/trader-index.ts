/**
 * Velox Studio — Trader Index (Discipline Score) Engine.
 *
 * A composite 0–100 score that measures how DISCIPLINED a trader is being,
 * not how profitable. A trader can be profitable while being reckless, and
 * the Trader Index is designed to flag exactly that — because reckless
 * profitability never lasts.
 *
 * Four pillars:
 *  1. Risk Consistency    — are position sizes / R-multiples within the
 *                           configured risk envelope (phaseRiskPct)?
 *  2. Rule Adherence      — does the trader log mistakes, miss stop-losses,
 *                           breach the daily risk cap, or trade without a setup?
 *  3. Emotional Control   — win rate under "revenge / fomo / anxious" vs
 *                           "calm / confident / disciplined / patient".
 *  4. Revenge Detection   — oversized position or rapid-fire entries shortly
 *                           after a loss.
 *
 * Each pillar returns a 0–100 sub-score. The overall is a weighted blend.
 * Violations surface as `RuleAlert[]` for the UI to render.
 */

import type { Trade } from "./types";
import type { TradingConfig } from "../trading-config";

// ────────────────────────────────────────────────────────────────
//  Types
// ────────────────────────────────────────────────────────────────

export type AlertSeverity = "critical" | "warning" | "info";

export interface RuleAlert {
  id: string;
  severity: AlertSeverity;
  category: "risk" | "rule" | "emotion" | "revenge";
  /** Short headline. */
  title: string;
  /** Longer explanation. */
  description: string;
  /** The trade(s) that triggered the alert. */
  tradeIds: string[];
  /** A human-readable reference, e.g. "XAUUSD · 2026-08-01". */
  tradeRefs: string[];
}

export interface TraderIndexBreakdown {
  overall: number;
  riskConsistency: number;
  ruleAdherence: number;
  emotionalControl: number;
  revengeDiscipline: number;
  /** Number of alerts by severity. */
  alertCounts: { critical: number; warning: number; info: number };
  /** Letter grade A–F for quick scanning. */
  grade: string;
}

export interface TraderIndexResult {
  breakdown: TraderIndexBreakdown;
  alerts: RuleAlert[];
}

// ────────────────────────────────────────────────────────────────
//  Constants
// ────────────────────────────────────────────────────────────────

const NEGATIVE_EMOTIONS = new Set([
  "revenge",
  "fomo",
  "anxious",
  "fearful",
  "greedy",
  "frustrated",
  "bored",
]);

const POSITIVE_EMOTIONS = new Set([
  "calm",
  "confident",
  "patient",
  "focused",
  "disciplined",
]);

/** Revenge window: trades within this ms after a loss count as suspicious. */
const REVENGE_WINDOW_MS = 60 * 60 * 1000; // 60 minutes
/** Rapid-fire: this many trades within REVENGE_WINDOW_MS after a loss. */
const RAPID_FIRE_THRESHOLD = 3;

// ────────────────────────────────────────────────────────────────
//  Main entry point
// ────────────────────────────────────────────────────────────────

export function calculateTraderIndex(
  trades: Trade[],
  config: TradingConfig,
): TraderIndexResult {
  const alerts: RuleAlert[] = [];
  const closed = trades
    .filter((t) => t.status === "closed" && typeof t.pnl === "number")
    .sort(
      (a, b) =>
        new Date(a.exit_time ?? a.entry_time).getTime() -
        new Date(b.exit_time ?? b.entry_time).getTime(),
    );

  if (closed.length === 0) {
    return {
      breakdown: {
        overall: 0,
        riskConsistency: 0,
        ruleAdherence: 0,
        emotionalControl: 0,
        revengeDiscipline: 0,
        alertCounts: { critical: 0, warning: 0, info: 0 },
        grade: "—",
      },
      alerts: [],
    };
  }

  const riskConsistency = scoreRiskConsistency(closed, config, alerts);
  const ruleAdherence = scoreRuleAdherence(closed, config, alerts);
  const emotionalControl = scoreEmotionalControl(closed, alerts);
  const revengeDiscipline = scoreRevengeDiscipline(closed, alerts);

  // Weighted blend. Rule adherence & revenge matter most for long-term survival.
  const overall = Math.round(
    riskConsistency * 0.25 +
      ruleAdherence * 0.35 +
      emotionalControl * 0.15 +
      revengeDiscipline * 0.25,
  );

  const alertCounts = {
    critical: alerts.filter((a) => a.severity === "critical").length,
    warning: alerts.filter((a) => a.severity === "warning").length,
    info: alerts.filter((a) => a.severity === "info").length,
  };

  return {
    breakdown: {
      overall: clamp(overall),
      riskConsistency: clamp(riskConsistency),
      ruleAdherence: clamp(ruleAdherence),
      emotionalControl: clamp(emotionalControl),
      revengeDiscipline: clamp(revengeDiscipline),
      alertCounts,
      grade: gradeFor(overall),
    },
    alerts: alerts.sort((a, b) => severityRank(a.severity) - severityRank(b.severity)),
  };
}

// ────────────────────────────────────────────────────────────────
//  Pillar 1 — Risk Consistency
//  Measures R-multiple variance and oversized-risk detection.
// ────────────────────────────────────────────────────────────────

function scoreRiskConsistency(
  closed: Trade[],
  config: TradingConfig,
  alerts: RuleAlert[],
): number {
  const withR = closed.filter((t) => t.r_multiple != null);

  // No R data → neutral score, but flag missing data.
  if (withR.length === 0) {
    if (closed.length >= 5) {
      alerts.push({
        id: "risk-no-r-data",
        severity: "info",
        category: "risk",
        title: "No R-multiple data",
        description:
          "Log stop-loss and exit prices on your trades so risk consistency can be measured.",
        tradeIds: [],
        tradeRefs: [],
      });
    }
    return 60;
  }

  // 1. Oversized losers: losses worse than -1.5R suggest oversized risk or
  //    moved stops. Each one is a warning.
  const oversized = withR.filter((t) => (t.r_multiple ?? 0) <= -1.5);
  for (const t of oversized) {
    alerts.push({
      id: `risk-oversized-${t.id}`,
      severity: "warning",
      category: "risk",
      title: `Loss exceeded -1.5R on ${t.symbol}`,
      description: `This trade lost ${t.r_multiple}R — beyond a standard 1R stop. This usually means the stop was moved or no stop was set.`,
      tradeIds: [t.id],
      tradeRefs: [tradeRef(t)],
    });
  }

  // 2. R-multiple consistency: lower stddev = more consistent sizing.
  const rValues = withR.map((t) => t.r_multiple ?? 0);
  const mean = rValues.reduce((a, b) => a + b, 0) / rValues.length;
  const variance =
    rValues.reduce((s, r) => s + (r - mean) ** 2, 0) / rValues.length;
  const stddev = Math.sqrt(variance);

  // stddev of ~1.0 is normal for a 1R-risk system. >2.0 is erratic.
  const consistencyScore = Math.max(0, Math.min(100, 100 - (stddev - 1) * 30));

  // 3. Daily risk cap breaches: group losses by day, flag days exceeding
  //    the configured dailyRiskLimitPct (we approximate balance from config).
  //    We can't know exact balance, so we flag days with 3+ consecutive losses.
  const dailyLossStreaks = detectDailyLossClusters(closed);
  for (const cluster of dailyLossStreaks) {
    alerts.push({
      id: `risk-daily-cluster-${cluster.date}`,
      severity: cluster.count >= 4 ? "critical" : "warning",
      category: "risk",
      title: `${cluster.count} losses on ${cluster.date}`,
      description: `Multiple losses clustered on a single day. Review whether you respected your ${config.dailyRiskLimitPct}% daily risk cap and stopped trading.`,
      tradeIds: cluster.tradeIds,
      tradeRefs: cluster.tradeRefs,
    });
  }

  // Penalize for oversized losers.
  const oversizedPenalty = oversized.length * 8;
  return clamp(consistencyScore - oversizedPenalty);
}

// ────────────────────────────────────────────────────────────────
//  Pillar 2 — Rule Adherence (TOPG risk rules)
// ────────────────────────────────────────────────────────────────

function scoreRuleAdherence(
  closed: Trade[],
  _config: TradingConfig,
  alerts: RuleAlert[],
): number {
  let deductions = 0;
  const total = closed.length;

  for (const t of closed) {
    // Missing stop-loss on a closed trade.
    if (t.stop_loss == null) {
      deductions += 6;
      if (deductions < 40) {
        alerts.push({
          id: `rule-no-stop-${t.id}`,
          severity: "critical",
          category: "rule",
          title: `No stop-loss on ${t.symbol}`,
          description: `Trading without a hard stop is the #1 account-blower. Every trade must have a predefined stop.`,
          tradeIds: [t.id],
          tradeRefs: [tradeRef(t)],
        });
      }
    }

    // Missing setup classification.
    if (!t.setup) {
      deductions += 2;
    }

    // Self-tagged mistakes.
    if (t.mistakes && t.mistakes.length > 0) {
      deductions += t.mistakes.length * 4;
      for (const m of t.mistakes) {
        if (m.toLowerCase().includes("revenge") || m.toLowerCase().includes("oversized")) {
          // Already heavy; don't double-alert revenge here (pillar 4 handles it).
          deductions += 2;
        }
      }
      if (t.mistakes.length >= 2 && deductions < 50) {
        alerts.push({
          id: `rule-mistakes-${t.id}`,
          severity: "warning",
          category: "rule",
          title: `${t.mistakes.length} mistakes tagged on ${t.symbol}`,
          description: `Tagged: ${t.mistakes.join(", ")}. Awareness is the first step — identify the pattern causing repeated mistakes.`,
          tradeIds: [t.id],
          tradeRefs: [tradeRef(t)],
        });
      }
    }
  }

  // Trades without any classification at all (setup + session both missing).
  const unclassified = closed.filter((t) => !t.setup && !t.session);
  if (unclassified.length >= 3) {
    alerts.push({
      id: "rule-unclassified",
      severity: "info",
      category: "rule",
      title: `${unclassified.length} trades lack classification`,
      description: "Tag setups and sessions on your trades to unlock pattern analysis.",
      tradeIds: unclassified.slice(0, 5).map((t) => t.id),
      tradeRefs: unclassified.slice(0, 5).map(tradeRef),
    });
  }

  return clamp(100 - deductions);
}

// ────────────────────────────────────────────────────────────────
//  Pillar 3 — Emotional Control
// ────────────────────────────────────────────────────────────────

function scoreEmotionalControl(closed: Trade[], alerts: RuleAlert[]): number {
  const negativeTrades = closed.filter(
    (t) => t.emotion_before?.some((e) => NEGATIVE_EMOTIONS.has(e.toLowerCase())),
  );
  const positiveTrades = closed.filter(
    (t) => t.emotion_before?.some((e) => POSITIVE_EMOTIONS.has(e.toLowerCase())),
  );

  if (negativeTrades.length === 0 && positiveTrades.length === 0) {
    return 70; // neutral — no emotion data logged.
  }

  // Win rate under negative vs positive emotion states.
  const negWR = winRate(negativeTrades);
  const posWR = winRate(positiveTrades);

  // Flag revenge/fomo trades that lost.
  const revengeLosses = closed.filter(
    (t) =>
      (t.pnl ?? 0) < 0 &&
      t.emotion_before?.some(
        (e) => e.toLowerCase() === "revenge" || e.toLowerCase() === "fomo",
      ),
  );
  for (const t of revengeLosses.slice(0, 3)) {
    alerts.push({
      id: `emotion-revenge-loss-${t.id}`,
      severity: "warning",
      category: "emotion",
      title: `Lost a trade taken out of ${t.emotion_before?.find((e) => e.toLowerCase() === "revenge" || e.toLowerCase() === "fomo")}`,
      description: `Emotion-driven entries have a ${negWR.toFixed(0)}% win rate vs ${posWR.toFixed(0)}% when calm. This trade on ${t.symbol} was a loss.`,
      tradeIds: [t.id],
      tradeRefs: [tradeRef(t)],
    });
  }

  // Score: base 80, +reward positive emotion edge, -penalize negative trades.
  const emotionEdge = posWR - negWR; // typically 10-30% if emotions matter
  const score = 70 + emotionEdge * 0.4 - negativeTrades.length * 3;
  return clamp(score);
}

// ────────────────────────────────────────────────────────────────
//  Pillar 4 — Revenge Trade Detection
//  Detects: (a) position size ↑ within 60min after a loss,
//           (b) 3+ trades within 30min after a loss.
// ────────────────────────────────────────────────────────────────

function scoreRevengeDiscipline(closed: Trade[], alerts: RuleAlert[]): number {
  if (closed.length < 2) return 90;

  let revengeFlags = 0;
  const quantities = closed.map((t) => t.quantity);
  const medianQty = median(quantities) || 1;

  for (let i = 1; i < closed.length; i++) {
    const prev = closed[i - 1];
    const curr = closed[i];

    const prevIsLoss = (prev.pnl ?? 0) < 0;
    if (!prevIsLoss) continue;

    const prevTime = new Date(prev.exit_time ?? prev.entry_time).getTime();
    const currTime = new Date(curr.entry_time).getTime();
    const gapMs = currTime - prevTime;

    if (gapMs < 0 || gapMs > REVENGE_WINDOW_MS) continue;

    // (a) Position size increased after a loss.
    const sizeIncrease = curr.quantity / medianQty;
    if (curr.quantity > medianQty && sizeIncrease >= 1.5) {
      revengeFlags++;
      alerts.push({
        id: `revenge-size-${curr.id}`,
        severity: "critical",
        category: "revenge",
        title: `Position size increased after a loss`,
        description: `You entered ${curr.symbol} with ${curr.quantity} lots within ${Math.round(gapMs / 60000)}min of a loss — ${sizeIncrease.toFixed(1)}× your median size. This is classic revenge-trading behavior.`,
        tradeIds: [curr.id, prev.id],
        tradeRefs: [tradeRef(curr), tradeRef(prev)],
      });
      continue;
    }

    // (b) Rapid-fire: count trades within the window after the loss.
    let rapidCount = 1; // curr
    for (let j = i + 1; j < closed.length; j++) {
      const jTime = new Date(closed[j].entry_time).getTime();
      if (jTime - prevTime <= REVENGE_WINDOW_MS) rapidCount++;
      else break;
    }
    if (rapidCount >= RAPID_FIRE_THRESHOLD && i === closed.indexOf(curr)) {
      revengeFlags++;
      alerts.push({
        id: `revenge-rapid-${curr.id}`,
        severity: "warning",
        category: "revenge",
        title: `${rapidCount} trades within 60min after a loss`,
        description: `Rapid-fire entries after a loss suggest emotional overtrading. Step away for 15 minutes after every loss.`,
        tradeIds: closed.slice(i, i + rapidCount).map((t) => t.id),
        tradeRefs: closed.slice(i, i + rapidCount).map(tradeRef),
      });
    }
  }

  // Score: start at 100, each revenge flag costs 15.
  return clamp(100 - revengeFlags * 15);
}

// ────────────────────────────────────────────────────────────────
//  Helpers
// ────────────────────────────────────────────────────────────────

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function winRate(trades: Trade[]): number {
  if (trades.length === 0) return 0;
  const wins = trades.filter((t) => (t.pnl ?? 0) > 0).length;
  return (wins / trades.length) * 100;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

function tradeRef(t: Trade): string {
  const date = (t.exit_time ?? t.entry_time).slice(0, 10);
  return `${t.symbol} · ${date}`;
}

function severityRank(s: AlertSeverity): number {
  return s === "critical" ? 0 : s === "warning" ? 1 : 2;
}

function gradeFor(score: number): string {
  if (score >= 90) return "A+";
  if (score >= 80) return "A";
  if (score >= 70) return "B";
  if (score >= 60) return "C";
  if (score >= 50) return "D";
  return "F";
}

function detectDailyLossClusters(
  closed: Trade[],
): { date: string; count: number; tradeIds: string[]; tradeRefs: string[] }[] {
  const byDay = new Map<
    string,
    { losses: Trade[]; all: Trade[] }
  >();

  for (const t of closed) {
    const date = (t.exit_time ?? t.entry_time).slice(0, 10);
    if (!byDay.has(date)) byDay.set(date, { losses: [], all: [] });
    const entry = byDay.get(date)!;
    entry.all.push(t);
    if ((t.pnl ?? 0) < 0) entry.losses.push(t);
  }

  const clusters: { date: string; count: number; tradeIds: string[]; tradeRefs: string[] }[] = [];
  for (const [date, { losses }] of byDay) {
    if (losses.length >= 3) {
      clusters.push({
        date,
        count: losses.length,
        tradeIds: losses.map((t) => t.id),
        tradeRefs: losses.map(tradeRef),
      });
    }
  }
  return clusters.sort((a, b) => b.count - a.count).slice(0, 5);
}
