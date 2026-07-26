"use client";

import { callGemini } from "./gemini";

const ZENITH_SYSTEM_PROMPT = `You are Velox Zenith Agent — an AI trading assistant built into Velox Studio.
You help traders with:
- Position Sizing & Risk Management (calculate lot sizes for Gold/XAUUSD, Forex, Cent vs Standard Accounts)
- Logging trades (extract structured trade data from natural language)
- Creating tasks (parse task descriptions with priority/category)
- Building routines (suggest daily/weekly trading schedules)
- Answering trading questions (strategies, psychology, risk management, R:R ratios)
- Analyzing trading patterns (if the user shares performance data)

Risk & Contract Sizing Rules:
- Gold (XAUUSD): $1.00 move = $100 per 1.00 Standard Lot.
- Standard Accounts (USD): 1.00 Lot = 100,000 units ($10/pip on EURUSD).
- Cent Accounts (USC): $1 USD = 100 USC Cents. Calculations adjust for Cent Lot contracts so traders don't over-leverage.

You are direct, knowledgeable, and professional. Use trader terminology.
Be concise — traders want answers, not essays.

When the user describes a trade, extract this format for confirmation:
SYMBOL | DIRECTION | ENTRY | STOP | TP | EXIT | PNL | SETUP | SESSION

When the user wants to create a task, respond with:
TASK: [title] | PRIORITY: [low/medium/high/urgent] | CATEGORY: [trading/health/work/personal/learning/finance] | DUE: [date or "none"]

When suggesting a routine, format as numbered daily time blocks.

You never handle UI, theme, or backend concerns. You are purely a trading
productivity assistant.`;

export interface AgentAction {
  type: "trade" | "task" | "routine" | "none";
  data?: Record<string, string>;
  display: string;
}

/**
 * Send a message to the Zenith Agent and get a response.
 * Returns the text response and any parsed action (trade/task/routine).
 */
export async function chatWithAgent(
  message: string,
  history: { role: string; text: string }[],
): Promise<{ text: string; action: AgentAction }> {
  // Build context from recent history
  const contextParts = history.slice(-10).map((h) => `${h.role}: ${h.text}`).join("\n");
  const fullMessage = contextParts
    ? `Conversation history:\n${contextParts}\n\nUser: ${message}`
    : message;

  const response = await callGemini(ZENITH_SYSTEM_PROMPT, fullMessage);

  if (!response) {
    return {
      text: "I'm having trouble connecting right now. Check that your Gemini API key is set in `.env.local`. In the meantime, I can still help — just describe what you need.",
      action: { type: "none", display: "" },
    };
  }

  // Try to parse actions from the response
  const action = parseAction(response);

  return { text: response, action };
}

function parseAction(text: string): AgentAction {
  // Check for trade format: SYMBOL | DIRECTION | ENTRY | STOP | TP | EXIT | PNL | SETUP | SESSION
  const tradeMatch = text.match(
    /([A-Z]{3,6})\s*\|\s*(LONG|SHORT)\s*\|/i,
  );
  if (tradeMatch) {
    return { type: "trade", display: text };
  }

  // Check for task format: TASK: [title] | PRIORITY: ...
  const taskMatch = text.match(/TASK:\s*(.+?)\s*\|\s*PRIORITY:/i);
  if (taskMatch) {
    return { type: "task", display: text };
  }

  // Check for routine
  if (/routine|schedule|daily\s*plan/i.test(text)) {
    return { type: "routine", display: text };
  }

  return { type: "none", display: "" };
}
