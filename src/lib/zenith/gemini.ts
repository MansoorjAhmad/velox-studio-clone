"use client";

/** Calls the protected server route; no API key is present in the browser. */
export async function callGemini(systemPrompt: string, userMessage: string): Promise<string | null> {
  try {
    const res = await fetch("/api/zenith", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ systemPrompt, userMessage }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.text ?? null;
  } catch {
    return null;
  }
}

export async function analyzeWithGemini(metricsJSON: string): Promise<string | null> {
  return callGemini(
    `You are Velox Zenith, an elite AI trading coach. Give specific, actionable insights based only on the trader's real performance data. Cover: the #1 priority fix, biggest strength, a hidden pattern, risk discipline, account breakdown, and this week's measurable focus. Use bold for key insights, cite numbers, be direct, and stay under 350 words. If there are fewer than five trades, say so and focus on emerging patterns.`,
    metricsJSON,
  );
}

export async function detectPatterns(tradesJSON: string): Promise<string | null> {
  return callGemini(
    `You are Velox Zenith, a pattern-detection engine for a solo trader. Find only non-obvious, data-supported behavioral patterns: time-of-day, revenge trading, setup degradation, session bias, emotional sequencing, and holding-time correlations. Return 3-5 concise bullets, each with a bold pattern name, supporting data, and an action. Stay under 250 words.`,
    tradesJSON,
  );
}

export async function weeklyPerformanceSummary(weekDataJSON: string): Promise<string | null> {
  return callGemini(
    `You are Velox Zenith writing a weekly trading performance debrief. Use this exact structure: ## Week in Review, ## What Went Well, ## What Hurt You, ## Behavioral Pattern This Week, ## One Thing to Fix Next Week, ## Discipline Score. Be direct, reference the supplied numbers, and stay under 400 words.`,
    weekDataJSON,
  );
}
