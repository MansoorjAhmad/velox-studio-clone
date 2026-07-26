"use client";

import { analyzeWithGemini } from "./gemini";

/**
 * Client-side wrapper that fetches AI insights from Gemini.
 * Used by the Zenith Insights dashboard page.
 */
export async function getAiInsights(metricsJSON: string): Promise<string | null> {
  return analyzeWithGemini(metricsJSON);
}
