"use client";

/**
 * Velox Zenith — Natural-Language Query over trade history.
 *
 * The user asks a question in plain English about their own trades. We
 * serialize a relevant slice of their data + computed metrics and ask Gemini
 * to answer from THEIR data (not generic trading advice).
 *
 * Falls back to a local summary when no API key is set.
 */

import { callGemini } from "./gemini";
import type { Trade } from "../journal/types";
import {
  calculateMetrics,
  breakdownBySetup,
  breakdownBySession,
  breakdownBySymbol,
} from "../journal/metrics";

export interface QueryResult {
  answer: string;
  /** Whether the answer came from Gemini (true) or a local fallback (false). */
  fromAI: boolean;
}

/**
 * Answer a natural-language question about the user's trades.
 * Returns a Gemini-powered answer, or a local fallback summary.
 */
export async function queryTradeHistory(
  question: string,
  trades: Trade[],
): Promise<QueryResult> {
  const metrics = calculateMetrics(trades);
  const setupRows = breakdownBySetup(trades).slice(0, 6);
  const sessionRows = breakdownBySession(trades);
  const symbolRows = breakdownBySymbol(trades).slice(0, 8);

  // Build a compact but rich data context.
  const recentTrades = trades
    .filter((t) => t.status === "closed")
    .slice(0, 50)
    .map((t) => ({
      symbol: t.symbol,
      direction: t.direction,
      pnl: t.pnl,
      r: t.r_multiple,
      setup: t.setup,
      session: t.session,
      date: (t.exit_time ?? t.entry_time).slice(0, 10),
      emotions: t.emotion_before,
      mistakes: t.mistakes,
    }));

  const dataContext = JSON.stringify(
    {
      question,
      accountMetrics: {
        totalTrades: metrics.totalTrades,
        closedTrades: metrics.closedTrades,
        winRate: +(metrics.winRate * 100).toFixed(1),
        profitFactor: metrics.profitFactor === Infinity ? null : +metrics.profitFactor.toFixed(2),
        netPnl: metrics.netPnl,
        expectancy: +metrics.expectancy.toFixed(2),
        avgRMultiple: +metrics.avgRMultiple.toFixed(2),
        avgWin: +metrics.avgWin.toFixed(2),
        avgLoss: +metrics.avgLoss.toFixed(2),
        maxWinStreak: metrics.maxWinStreak,
        maxLossStreak: metrics.maxLossStreak,
        bestTrade: metrics.bestTrade,
        worstTrade: metrics.worstTrade,
      },
      setupBreakdown: setupRows,
      sessionBreakdown: sessionRows,
      symbolBreakdown: symbolRows,
      recentClosedTrades: recentTrades,
    },
    null,
    2,
  );

  const systemPrompt = `You are Velox Zenith, answering a trader's question about THEIR OWN trade history.
You have been given their real journal data below. Answer ONLY from their data — do not give generic advice unless explicitly asked.

Rules:
- Be direct and concise (under 200 words).
- Reference their actual numbers, setups, and sessions.
- If the data can't answer the question, say so honestly.
- Use clean markdown with **bold** for key figures.`;

  const answer = await callGemini(systemPrompt, dataContext);

  if (answer) {
    return { answer, fromAI: true };
  }

  // Local fallback — a structured summary based on the question keywords.
  return { answer: localFallback(question, metrics, setupRows, sessionRows), fromAI: false };
}

function localFallback(
  question: string,
  metrics: ReturnType<typeof calculateMetrics>,
  setups: ReturnType<typeof breakdownBySetup>,
  sessions: ReturnType<typeof breakdownBySession>,
): string {
  const q = question.toLowerCase();

  if (q.includes("best") && (q.includes("setup") || q.includes("strategy"))) {
    const best = setups[0];
    return best
      ? `Your best setup is **${best.key}** with a ${(best.winRate * 100).toFixed(0)}% win rate and $${best.netPnl.toFixed(0)} net P&L across ${best.trades} trades.`
      : "Not enough setup-tagged trades to determine your best setup. Tag your setups to unlock this.";
  }

  if (q.includes("session") || q.includes("time")) {
    const best = sessions[0];
    return best
      ? `Your strongest session is **${best.key}** (${(best.winRate * 100).toFixed(0)}% win rate, $${best.netPnl.toFixed(0)}).`
      : "Tag sessions on your trades to analyze session performance.";
  }

  if (q.includes("win rate") || q.includes("winrate")) {
    return `Your overall win rate is **${(metrics.winRate * 100).toFixed(1)}%** (${metrics.wins}W / ${metrics.losses}L across ${metrics.closedTrades} closed trades).`;
  }

  if (q.includes("profit factor")) {
    const pf = metrics.profitFactor === Infinity ? "∞" : metrics.profitFactor.toFixed(2);
    return `Your profit factor is **${pf}**. ${metrics.profitFactor >= 1.5 ? "That's a healthy edge." : metrics.profitFactor >= 1 ? "Marginally profitable — build it higher." : "Below 1.0 means you're net losing. Focus on cutting losers."}`;
  }

  if (q.includes("streak")) {
    return `Your longest win streak is **${metrics.maxWinStreak}** trades and longest loss streak is **${metrics.maxLossStreak}**.`;
  }

  return `**Note:** Set your Gemini API key in Settings to get AI-powered answers. 

Here's a quick summary of your stats: ${(metrics.winRate * 100).toFixed(1)}% win rate, profit factor ${metrics.profitFactor === Infinity ? "∞" : metrics.profitFactor.toFixed(2)}, net P&L $${metrics.netPnl.toFixed(0)} across ${metrics.closedTrades} trades. Ask about setups, sessions, win rate, or streaks for specific insights.`;
}
