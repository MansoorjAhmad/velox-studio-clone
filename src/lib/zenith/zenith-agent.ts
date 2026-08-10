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

export interface ParsedTrade {
  symbol: string;
  direction: "LONG" | "SHORT";
  entry_price: number | null;
  stop_loss: number | null;
  take_profit: number | null;
  exit_price: number | null;
  pnl: number | null;
  setup: string | null;
  session: string | null;
}

export interface ParsedTask {
  title: string;
  priority: "low" | "medium" | "high" | "urgent";
  category: "trading" | "health" | "work" | "personal" | "learning" | "finance";
  due_date: string | null;
}

export type AgentAction =
  | { type: "trade"; data: ParsedTrade; display: string }
  | { type: "task"; data: ParsedTask; display: string }
  | { type: "routine"; display: string }
  | { type: "none"; display: string };

export async function chatWithAgent(
  message: string,
  history: { role: string; text: string }[],
): Promise<{ text: string; action: AgentAction }> {
  const contextParts = history.slice(-10).map((h) => `${h.role}: ${h.text}`).join("\n");
  const fullMessage = contextParts
    ? `Conversation history:\n${contextParts}\n\nUser: ${message}`
    : message;
  const response = await callGemini(ZENITH_SYSTEM_PROMPT, fullMessage);

  if (!response) {
    return {
      text: "I'm having trouble connecting right now. Please try again in a moment.",
      action: { type: "none", display: "" },
    };
  }

  return { text: response, action: parseAction(response) };
}

export function parseAction(text: string): AgentAction {
  const tradeMatch = text.match(
    /([A-Z]{3,6})\s*\|\s*(LONG|SHORT)\s*\|\s*([\d.]+|-)\s*\|\s*([\d.]+|-)\s*\|\s*([\d.]+|-)\s*\|\s*([\d.]+|-)\s*\|\s*(-?[\d.]+|-)\s*\|\s*([^|]+)\s*\|\s*([^\n|]+)/i,
  );
  if (tradeMatch) {
    const [, symbol, direction, entry, stop, tp, exit, pnl, setup, session] = tradeMatch;
    const numberOrNull = (value: string) => {
      const number = value === "-" ? null : Number.parseFloat(value);
      return number != null && Number.isFinite(number) ? number : null;
    };
    return {
      type: "trade",
      data: {
        symbol: symbol.toUpperCase(),
        direction: direction.toUpperCase() as "LONG" | "SHORT",
        entry_price: numberOrNull(entry),
        stop_loss: numberOrNull(stop),
        take_profit: numberOrNull(tp),
        exit_price: numberOrNull(exit),
        pnl: numberOrNull(pnl),
        setup: setup.trim() || null,
        session: session.trim() || null,
      },
      display: text,
    };
  }

  const taskMatch = text.match(
    /TASK:\s*(.+?)\s*\|\s*PRIORITY:\s*(low|medium|high|urgent)\s*\|\s*CATEGORY:\s*(trading|health|work|personal|learning|finance)\s*\|\s*DUE:\s*([^\n]+)/i,
  );
  if (taskMatch) {
    const [, title, priority, category, due] = taskMatch;
    const dueValue = due.trim();
    return {
      type: "task",
      data: {
        title: title.trim(),
        priority: priority.toLowerCase() as ParsedTask["priority"],
        category: category.toLowerCase() as ParsedTask["category"],
        due_date: dueValue.toLowerCase() === "none" ? null : dueValue,
      },
      display: text,
    };
  }

  if (/routine|schedule|daily\s*plan/i.test(text)) return { type: "routine", display: text };
  return { type: "none", display: text };
}
