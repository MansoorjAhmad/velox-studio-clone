import type { Trade } from "./types";
import { calculateMetrics } from "./metrics";

export interface SystemQualityBreakdown {
  overall: number;
  discipline: number;
  execution: number;
  riskCompliance: number;
}

/** Composite 0–100 score from trade journal data. */
export function calculateSystemQuality(trades: Trade[]): SystemQualityBreakdown {
  const closed = trades.filter((t) => t.status === "closed" && t.pnl != null);
  if (closed.length === 0) {
    return { overall: 0, discipline: 0, execution: 0, riskCompliance: 0 };
  }

  const metrics = calculateMetrics(trades);

  // Discipline: setup + session tagged, no mistakes logged
  const disciplined = closed.filter(
    (t) => t.setup && t.session && (!t.mistakes || t.mistakes.length === 0),
  );
  const discipline = Math.round((disciplined.length / closed.length) * 100);

  // Execution: win rate + profit factor + avg R normalized
  const wrScore = metrics.winRate * 100;
  const pfScore = Math.min(100, metrics.profitFactor * 33);
  const rScore = Math.min(100, Math.max(0, metrics.avgRMultiple * 40 + 50));
  const execution = Math.round(wrScore * 0.4 + pfScore * 0.35 + rScore * 0.25);

  // Risk compliance: trades with R-multiple data within reasonable bounds
  const withR = closed.filter((t) => t.r_multiple != null);
  const compliantR = withR.filter((t) => {
    const r = Math.abs(t.r_multiple!);
    return r <= 3;
  });
  const riskCompliance =
    withR.length > 0
      ? Math.round((compliantR.length / withR.length) * 100)
      : Math.round(Math.min(100, 100 - metrics.maxLossStreak * 8));

  const overall = Math.round(discipline * 0.35 + execution * 0.4 + riskCompliance * 0.25);

  return {
    overall: Math.min(100, Math.max(0, overall)),
    discipline: Math.min(100, discipline),
    execution: Math.min(100, execution),
    riskCompliance: Math.min(100, riskCompliance),
  };
}
