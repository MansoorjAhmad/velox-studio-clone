/**
 * Velox Zenith — Cross-Trade Pattern Detection.
 *
 * Computes statistical patterns from the trade journal that a human would
 * struggle to spot manually. These are surfaced to the UI directly AND
 * serialized for Gemini to narrate into natural-language insights.
 *
 * All detection is pure & local — no API calls. The AI layer (weekly review,
 * NL query) consumes the output of this module.
 */

import type { Trade } from "../journal/types";

export interface DetectedPattern {
  id: string;
  /** "edge" = a strength to exploit; "leak" = a weakness to fix. */
  kind: "edge" | "leak" | "neutral";
  /** Short headline. */
  title: string;
  /** Detailed explanation with the numbers. */
  detail: string;
  /** Severity 1–5 for leaks (5 = account-threatening). */
  severity?: number;
}

const isClosed = (t: Trade) => t.status === "closed" && typeof t.pnl === "number";

export function detectPatterns(trades: Trade[]): DetectedPattern[] {
  const closed = trades
    .filter(isClosed)
    .sort(
      (a, b) =>
        new Date(a.exit_time ?? a.entry_time).getTime() -
        new Date(b.exit_time ?? b.entry_time).getTime(),
    );

  if (closed.length < 3) return [];

  const patterns: DetectedPattern[] = [];

  detectPostLossStreakPattern(closed, patterns);
  detectBestHour(closed, patterns);
  detectWorstHour(closed, patterns);
  detectFridayDecay(closed, patterns);
  detectBestSession(closed, patterns);
  detectOversizedAfterWin(closed, patterns);
  detectLateNightTrading(closed, patterns);
  detectHoldTimePattern(closed, patterns);
  detectConfluenceEdge(closed, patterns);

  return patterns;
}

// ────────────────────────────────────────────────────────────────
//  Pattern: performance after consecutive losses
//  "You lose X% of trades taken after 2+ consecutive losses"
// ────────────────────────────────────────────────────────────────

function detectPostLossStreakPattern(closed: Trade[], out: DetectedPattern[]) {
  let consecutiveLosses = 0;
  let tradesAfter2Losses = 0;
  let lossesAfter2Losses = 0;
  let pnlAfter2Losses = 0;

  for (const t of closed) {
    const isLoss = (t.pnl ?? 0) < 0;
    if (consecutiveLosses >= 2) {
      tradesAfter2Losses++;
      pnlAfter2Losses += t.pnl ?? 0;
      if (isLoss) lossesAfter2Losses++;
    }
    if (isLoss) consecutiveLosses++;
    else consecutiveLosses = 0;
  }

  if (tradesAfter2Losses >= 3) {
    const lossRate = (lossesAfter2Losses / tradesAfter2Losses) * 100;
    const kind: DetectedPattern["kind"] = lossRate > 55 ? "leak" : lossRate < 40 ? "edge" : "neutral";
    out.push({
      id: "post-loss-streak",
      kind,
      title: `${lossRate.toFixed(0)}% loss rate after 2 consecutive losses`,
      detail: `You took ${tradesAfter2Losses} trades immediately following a 2-loss streak and lost ${lossesAfter2Losses} of them (net ${formatPnl(pnlAfter2Losses)}). ${kind === "leak" ? "This is tilt-driven trading — step away after 2 losses." : kind === "edge" ? "Impressive composure — you actually trade well under pressure." : "Your performance is stable after losing streaks."}`,
      severity: kind === "leak" ? 4 : undefined,
    });
  }
}

// ────────────────────────────────────────────────────────────────
//  Pattern: best & worst trading hour
// ────────────────────────────────────────────────────────────────

function detectBestHour(closed: Trade[], out: DetectedPattern[]) {
  const byHour = new Map<number, { wins: number; total: number; pnl: number }>();
  for (const t of closed) {
    const h = new Date(t.entry_time).getUTCHours();
    const e = byHour.get(h) ?? { wins: 0, total: 0, pnl: 0 };
    e.total++;
    e.pnl += t.pnl ?? 0;
    if ((t.pnl ?? 0) > 0) e.wins++;
    byHour.set(h, e);
  }
  const eligible = Array.from(byHour.entries()).filter(([, v]) => v.total >= 3);
  if (eligible.length === 0) return;
  eligible.sort((a, b) => b[1].pnl - a[1].pnl);
  const [bestH, best] = eligible[0];
  const wr = (best.wins / best.total) * 100;
  out.push({
    id: "best-hour",
    kind: "edge",
    title: `Best hour: ${String(bestH).padStart(2, "0")}:00 UTC`,
    detail: `${wr.toFixed(0)}% win rate and ${formatPnl(best.pnl)} net across ${best.total} trades. Concentrate your activity here.`,
  });
}

function detectWorstHour(closed: Trade[], out: DetectedPattern[]) {
  const byHour = new Map<number, { wins: number; total: number; pnl: number }>();
  for (const t of closed) {
    const h = new Date(t.entry_time).getUTCHours();
    const e = byHour.get(h) ?? { wins: 0, total: 0, pnl: 0 };
    e.total++;
    e.pnl += t.pnl ?? 0;
    if ((t.pnl ?? 0) > 0) e.wins++;
    byHour.set(h, e);
  }
  const eligible = Array.from(byHour.entries()).filter(([, v]) => v.total >= 3);
  if (eligible.length === 0) return;
  eligible.sort((a, b) => a[1].pnl - b[1].pnl);
  const [worstH, worst] = eligible[0];
  const wr = (worst.wins / worst.total) * 100;
  out.push({
    id: "worst-hour",
    kind: "leak",
    severity: 3,
    title: `Worst hour: ${String(worstH).padStart(2, "0")}:00 UTC`,
    detail: `Only ${wr.toFixed(0)}% win rate and ${formatPnl(worst.pnl)} net across ${worst.total} trades. Avoid trading in this window.`,
  });
}

// ────────────────────────────────────────────────────────────────
//  Pattern: Friday afternoon decay
// ────────────────────────────────────────────────────────────────

function detectFridayDecay(closed: Trade[], out: DetectedPattern[]) {
  const friday = closed.filter((t) => new Date(t.entry_time).getUTCDay() === 5);
  const otherDays = closed.filter((t) => new Date(t.entry_time).getUTCDay() !== 5);
  if (friday.length < 3 || otherDays.length < 3) return;

  const friWR = (friday.filter((t) => (t.pnl ?? 0) > 0).length / friday.length) * 100;
  const otherWR = (otherDays.filter((t) => (t.pnl ?? 0) > 0).length / otherDays.length) * 100;
  const friPnl = friday.reduce((s, t) => s + (t.pnl ?? 0), 0);

  if (friWR < otherWR - 15) {
    out.push({
      id: "friday-decay",
      kind: "leak",
      severity: 3,
      title: `Friday win rate drops to ${friWR.toFixed(0)}%`,
      detail: `You win ${otherWR.toFixed(0)}% on other days but only ${friWR.toFixed(0)}% on Fridays (net ${formatPnl(friPnl)}). Weekend risk + lower liquidity may be hurting you. Consider stopping early on Fridays.`,
    });
  }
}

// ────────────────────────────────────────────────────────────────
//  Pattern: best session
// ────────────────────────────────────────────────────────────────

function detectBestSession(closed: Trade[], out: DetectedPattern[]) {
  const sessions = ["Asia", "London", "New York"] as const;
  let best: { session: string; wr: number; pnl: number; total: number } | null = null;
  for (const s of sessions) {
    const st = closed.filter((t) => t.session === s);
    if (st.length < 3) continue;
    const wr = (st.filter((t) => (t.pnl ?? 0) > 0).length / st.length) * 100;
    const pnl = st.reduce((sum, t) => sum + (t.pnl ?? 0), 0);
    if (!best || pnl > best.pnl) best = { session: s, wr, pnl, total: st.length };
  }
  if (best) {
    out.push({
      id: "best-session",
      kind: "edge",
      title: `${best.session} session is your strongest`,
      detail: `${best.wr.toFixed(0)}% win rate and ${formatPnl(best.pnl)} across ${best.total} trades. This is where your edge lives — prioritize it.`,
    });
  }
}

// ────────────────────────────────────────────────────────────────
//  Pattern: oversized position after a win (overconfidence)
// ────────────────────────────────────────────────────────────────

function detectOversizedAfterWin(closed: Trade[], out: DetectedPattern[]) {
  const qtys = closed.map((t) => t.quantity);
  const med = median(qtys) || 1;
  let oversizedAfterWin = 0;

  for (let i = 1; i < closed.length; i++) {
    const prevWin = (closed[i - 1].pnl ?? 0) > 0;
    if (prevWin && closed[i].quantity > med * 1.5) oversizedAfterWin++;
  }

  if (oversizedAfterWin >= 2) {
    out.push({
      id: "oversized-after-win",
      kind: "leak",
      severity: 3,
      title: `${oversizedAfterWin} oversized positions after wins`,
      detail: `You increased position size by 50%+ after winning trades ${oversizedAfterWin} times. This is overconfidence sizing — keep risk consistent regardless of recent results.`,
    });
  }
}

// ────────────────────────────────────────────────────────────────
//  Pattern: late-night / off-hours trading
// ────────────────────────────────────────────────────────────────

function detectLateNightTrading(closed: Trade[], out: DetectedPattern[]) {
  // Trades between 23:00–05:00 UTC (outside major sessions).
  const lateNight = closed.filter((t) => {
    const h = new Date(t.entry_time).getUTCHours();
    return h >= 23 || h < 5;
  });
  if (lateNight.length < 3) return;
  const wr = (lateNight.filter((t) => (t.pnl ?? 0) > 0).length / lateNight.length) * 100;
  const pnl = lateNight.reduce((s, t) => s + (t.pnl ?? 0), 0);
  if (wr < 40 || pnl < 0) {
    out.push({
      id: "late-night",
      kind: "leak",
      severity: 2,
      title: `${wr.toFixed(0)}% win rate during off-hours (23:00–05:00 UTC)`,
      detail: `${lateNight.length} trades taken outside major sessions with ${formatPnl(pnl)} net. Low-liquidity hours often produce choppy, unpredictable price action.`,
    });
  }
}

// ────────────────────────────────────────────────────────────────
//  Pattern: hold-time vs outcome (cutting winners / holding losers)
// ────────────────────────────────────────────────────────────────

function detectHoldTimePattern(closed: Trade[], out: DetectedPattern[]) {
  const withExit = closed.filter((t) => t.exit_time);
  if (withExit.length < 5) return;

  const winners = withExit.filter((t) => (t.pnl ?? 0) > 0);
  const losers = withExit.filter((t) => (t.pnl ?? 0) < 0);
  if (winners.length < 2 || losers.length < 2) return;

  const avgWinHold =
    winners.reduce(
      (s, t) =>
        s +
        (new Date(t.exit_time!).getTime() - new Date(t.entry_time).getTime()) / 60000,
      0,
    ) / winners.length;
  const avgLossHold =
    losers.reduce(
      (s, t) =>
        s +
        (new Date(t.exit_time!).getTime() - new Date(t.entry_time).getTime()) / 60000,
      0,
    ) / losers.length;

  // Holding losers much longer than winners = classic destructive habit.
  if (avgLossHold > avgWinHold * 1.8) {
    out.push({
      id: "hold-losers-longer",
      kind: "leak",
      severity: 4,
      title: `Holding losers ${Math.round(avgLossHold)}min vs winners ${Math.round(avgWinHold)}min`,
      detail: `You hold losing trades ${Math.round(avgLossHold / avgWinHold)}× longer than winners. This is the #1 profitability destroyer — cut losers fast, let winners run.`,
    });
  } else if (avgWinHold > avgLossHold * 1.5) {
    out.push({
      id: "let-winners-run",
      kind: "edge",
      title: `Letting winners run (${Math.round(avgWinHold)}min vs ${Math.round(avgLossHold)}min losers)`,
      detail: `You hold winners ${Math.round(avgWinHold / avgLossHold)}× longer than losers — textbook disciplined trade management.`,
    });
  }
}

// ────────────────────────────────────────────────────────────────
//  Pattern: confluence edge
// ────────────────────────────────────────────────────────────────

function detectConfluenceEdge(closed: Trade[], out: DetectedPattern[]) {
  const map = new Map<string, { wins: number; total: number; pnl: number }>();
  for (const t of closed) {
    if (!t.confluences?.length) continue;
    for (const c of t.confluences) {
      const e = map.get(c) ?? { wins: 0, total: 0, pnl: 0 };
      e.total++;
      e.pnl += t.pnl ?? 0;
      if ((t.pnl ?? 0) > 0) e.wins++;
      map.set(c, e);
    }
  }
  const eligible = Array.from(map.entries()).filter(([, v]) => v.total >= 3);
  if (eligible.length === 0) return;
  eligible.sort((a, b) => b[1].pnl - a[1].pnl);
  const [tag, d] = eligible[0];
  const wr = (d.wins / d.total) * 100;
  if (wr >= 55 && d.pnl > 0) {
    out.push({
      id: `confluence-${tag}`,
      kind: "edge",
      title: `${tag} confluence: ${wr.toFixed(0)}% win rate`,
      detail: `Trades tagged with ${tag} win ${wr.toFixed(0)}% of the time with ${formatPnl(d.pnl)} net across ${d.total} trades. This is a high-probability filter — require it more often.`,
    });
  }
}

// ────────────────────────────────────────────────────────────────
//  Helpers
// ────────────────────────────────────────────────────────────────

function formatPnl(n: number): string {
  const sign = n >= 0 ? "+" : "-";
  return `${sign}$${Math.abs(n).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// ────────────────────────────────────────────────────────────────
//  Serialization for Gemini
// ────────────────────────────────────────────────────────────────

export function serializePatternsForAI(patterns: DetectedPattern[]): string {
  if (patterns.length === 0) return "No statistically significant patterns detected yet (need more trades).";
  return patterns
    .map(
      (p) =>
        `[${p.kind.toUpperCase()}${p.severity ? ` L${p.severity}` : ""}] ${p.title}: ${p.detail}`,
    )
    .join("\n");
}
