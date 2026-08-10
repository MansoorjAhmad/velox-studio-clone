"use client";

/**
 * Velox Zenith — Weekly Performance Review.
 *
 * Generates a structured weekly review by combining locally-computed metrics
 * + cross-trade patterns, then asking Gemini to narrate them into a sharp,
 * actionable review. Cached in localStorage so the user can revisit it.
 */

import { callGemini } from "./gemini";
import { detectPatterns, serializePatternsForAI } from "./patterns";
import type { Trade } from "../journal/types";
import { calculateMetrics, calculateDrawdown } from "../journal/metrics";
import { createClient } from "@/lib/supabase/client";

const REVIEW_CACHE_KEY = "velox_weekly_review_cache";

export interface WeeklyReviewInput {
  trades: Trade[];
  weekStart: string;
  weekEnd: string;
}

export interface CachedReview {
  weekStart: string;
  weekEnd: string;
  generatedAt: string;
  review: string;
}

/** Get the Monday of the current week (UTC, YYYY-MM-DD). */
export function currentWeekStart(): string {
  const now = new Date();
  const day = now.getUTCDay();
  const diff = now.getUTCDate() - day + (day === 0 ? -6 : 1);
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), diff))
    .toISOString()
    .slice(0, 10);
}

/** Filter trades to the current week (Mon 00:00 UTC → now). */
export function tradesThisWeek(trades: Trade[]): Trade[] {
  const start = currentWeekStart();
  return trades.filter((t) => t.entry_time.slice(0, 10) >= start);
}

/**
 * Generate a weekly review. Returns null if Gemini is unavailable.
 * The local metrics + patterns are always available separately.
 */
export async function generateWeeklyReview({
  trades,
  weekStart,
  weekEnd,
}: WeeklyReviewInput): Promise<string | null> {
  const weekTrades = trades.filter(
    (t) => t.entry_time.slice(0, 10) >= weekStart && t.entry_time.slice(0, 10) <= weekEnd,
  );

  const metrics = calculateMetrics(weekTrades);
  const drawdown = calculateDrawdown(weekTrades);
  const patterns = detectPatterns(weekTrades);

  const dataPayload = JSON.stringify(
    {
      period: `${weekStart} to ${weekEnd}`,
      summary: {
        totalTrades: metrics.totalTrades,
        closedTrades: metrics.closedTrades,
        winRate: `${(metrics.winRate * 100).toFixed(1)}%`,
        profitFactor: metrics.profitFactor === Infinity ? "inf" : metrics.profitFactor.toFixed(2),
        netPnl: metrics.netPnl,
        expectancy: metrics.expectancy,
        avgRMultiple: metrics.avgRMultiple,
        maxWinStreak: metrics.maxWinStreak,
        maxLossStreak: metrics.maxLossStreak,
        maxDrawdown: drawdown.maxDrawdown,
        bestTrade: metrics.bestTrade,
        worstTrade: metrics.worstTrade,
      },
      detectedPatterns: serializePatternsForAI(patterns),
    },
    null,
    2,
  );

  const systemPrompt = `You are Velox Zenith, an elite trading performance coach reviewing a trader's week.
Generate a structured weekly review in clean markdown. Be direct, specific, and use trader terminology.

Structure your review EXACTLY as:
## ⚡ This Week in One Sentence
[A single punchy sentence summarizing the week]

## 🟢 What Worked
[2-3 specific strengths, referencing real numbers]

## 🔴 What Leaked
[2-3 specific weaknesses with the data]

## 🎯 Next Week's Focus
[3 concrete, actionable rules for next week]

Keep the entire review under 400 words. No fluff. Reference the actual numbers provided.`;

  return callGemini(systemPrompt, dataPayload);
}

/** Cache a generated review so the user can revisit it. */
export function cacheReview(review: CachedReview): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(REVIEW_CACHE_KEY, JSON.stringify(review));
}

/** Retrieve the cached review, or null. */
export function getCachedReview(): CachedReview | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(REVIEW_CACHE_KEY);
    return raw ? (JSON.parse(raw) as CachedReview) : null;
  } catch {
    return null;
  }
}

export async function syncCachedReviewFromServer(): Promise<CachedReview | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return getCachedReview();
  const { data, error } = await supabase.from("weekly_review_cache").select("review_data").eq("user_id", user.id).maybeSingle();
  if (error || !data?.review_data) return getCachedReview();
  const review = data.review_data as CachedReview;
  cacheReview(review);
  return review;
}

export async function cacheReviewSynced(review: CachedReview): Promise<void> {
  cacheReview(review);
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) await supabase.from("weekly_review_cache").upsert({ user_id: user.id, review_data: review });
}
