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
 * Takes serialized metrics and returns AI-generated insights.
 */
export async function analyzeWithGemini(
  metricsJSON: string,
): Promise<string | null> {
  return callGemini(
    `You are Velox Zenith — an elite AI trading analyst built into Velox Studio.
You analyze a trader's performance data and provide sharp, actionable insights.
You are direct, concise, and use trader terminology. No fluff.

Your analysis should cover:
1. The #1 thing the trader should fix RIGHT NOW
2. Their biggest strength (be specific)
3. A specific routine or rule suggestion
4. Risk management assessment

Format your response in clean markdown. Use **bold** for emphasis.
Keep it under 300 words. If the trader has fewer than 5 trades, focus on
what patterns are forming and what to watch for.`,
    metricsJSON,
  );
}
