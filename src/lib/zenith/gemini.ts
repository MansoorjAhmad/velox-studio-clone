"use client";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { getApiKey } from "./api-key";

/**
 * Call the Gemini API with the given system prompt and user message.
 * Returns the text response or null on failure.
 * Gracefully handles missing API keys — never crashes the UI.
 *
 * The API key is read from localStorage (set via Settings page)
 * with a fallback to NEXT_PUBLIC_GEMINI_API_KEY env var.
 */
export async function callGemini(
  systemPrompt: string,
  userMessage: string,
): Promise<string | null> {
  const apiKey = getApiKey();
  if (!apiKey) {
    return null;
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    // Gemini 3.5 Flash-Lite — released July 21 2026, 350 tok/s, multimodal
    const model = genAI.getGenerativeModel({
      model: "gemini-3.5-flash-lite",
      systemInstruction: systemPrompt,
    });

    const result = await model.generateContent(userMessage);
    const response = result.response;
    return response.text();
  } catch (err) {
    // Fallback to 2.5-flash if 3.5-flash-lite is unavailable
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        systemInstruction: systemPrompt,
      });
      const result = await model.generateContent(userMessage);
      return result.response.text();
    } catch {
      // Last resort: 2.0-flash
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
          model: "gemini-2.0-flash",
          systemInstruction: systemPrompt,
        });
        const result = await model.generateContent(userMessage);
        return result.response.text();
      } catch (fallbackErr) {
        console.error("[Zenith] Gemini error:", fallbackErr);
        return null;
      }
    }
  }
}

/**
 * Analyze the user's trading data with Gemini.
 * Rule-aware: reads trading config so advice is specific to their system.
 */
export async function analyzeWithGemini(
  metricsJSON: string,
): Promise<string | null> {
  return callGemini(
    `You are Velox Zenith — an elite AI trading coach embedded inside Velox Studio, a personal trading OS.

Your role is to give the trader SPECIFIC, ACTIONABLE insights based on their real performance data.
You know their trading config: risk per trade, daily risk cap, monthly profit target, and current phase.
You are not a generic trading advisor — you are their personal performance analyst.

Your analysis MUST cover:
1. **#1 Priority Fix** — The single most impactful thing to change RIGHT NOW (be brutally specific)
2. **Biggest Strength** — What they are genuinely doing well (cite specific numbers)
3. **Hidden Pattern** — A non-obvious pattern in their data they may not have noticed
4. **Risk Discipline** — Are they respecting their risk rules? Name specific violations if any.
5. **This Week's Focus** — One concrete, measurable thing to focus on this week only.

Rules for your response:
- Use **bold** for key insights
- Under 350 words total
- Be direct like a pro trader mentor, not a chatbot
- Reference specific numbers from the data
- If fewer than 5 trades, say so and focus on what patterns are forming`,
    metricsJSON,
  );
}

/**
 * Detect hidden behavioral patterns in the trader's trade log.
 * Surfaces non-obvious patterns proactively.
 */
export async function detectPatterns(
  tradesJSON: string,
): Promise<string | null> {
  return callGemini(
    `You are Velox Zenith — a pattern detection engine for a solo trader.

Your job is to find NON-OBVIOUS behavioral patterns in their trade log.
Do NOT state the obvious. Find the hidden patterns that hurt or help them.

Look for:
- Time-of-day patterns (do they lose more after 3PM? Win more on Mondays?)
- Revenge trading signals (does a loss increase the next trade size?)
- Setup degradation (does win rate fall on the 3rd+ trade of a day?)
- Session bias (which session produces their best vs worst trades?)
- Emotional sequencing (do they overtrade after a big win?)
- Holding time correlation (do quick exits produce better results?)

Format: 3-5 bullet points, each starting with the pattern name in bold.
Each bullet: **Pattern Name** — what it is, the data supporting it, what to do.
Keep under 250 words. Only include patterns you can actually see in the data.`,
    tradesJSON,
  );
}

/**
 * Generate a weekly performance summary — on-demand from Zenith page.
 */
export async function weeklyPerformanceSummary(
  weekDataJSON: string,
): Promise<string | null> {
  return callGemini(
    `You are Velox Zenith — writing a weekly performance debrief for a solo trader.

This is their Week in Review report. Be structured, clear, and honest.
Think like a prop firm manager writing a weekly review for a funded trader.

Your report MUST follow this exact structure:

## Week in Review
**Net P&L:** [amount]
**Trades:** [count] ([wins]W / [losses]L)
**Win Rate:** [%]

## What Went Well
[2-3 specific wins with numbers]

## What Hurt You
[2-3 specific problems with numbers — be direct]

## Behavioral Pattern This Week
[One key behavioral observation]

## One Thing to Fix Next Week
[Single, specific, measurable action]

## Discipline Score
[Estimate 0-100 based on rule adherence]

Keep the full report under 400 words. Use markdown formatting.`,
    weekDataJSON,
  );
}
