import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Daily Summary Email API Route
 *
 * Generates a trading day summary and sends it via Resend.
 * Can be triggered manually (GET) or by a Supabase Edge Function cron.
 *
 * Required env vars:
 *   RESEND_API_KEY     — from resend.com (free: 100 emails/day)
 *   SUMMARY_EMAIL_TO   — your email address
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_TO = process.env.SUMMARY_EMAIL_TO;
const FROM_EMAIL = "zenith@veloxstudio.app";

export async function GET() {
  if (!RESEND_API_KEY || !EMAIL_TO) {
    return NextResponse.json(
      { error: "Missing RESEND_API_KEY or SUMMARY_EMAIL_TO env vars" },
      { status: 400 },
    );
  }

  // Fetch today's trades from Supabase
  const supabase = await createClient();
  const todayStr = new Date().toISOString().split("T")[0];

  const { data: trades, error } = await supabase
    .from("trades")
    .select("*")
    .gte("entry_time", `${todayStr}T00:00:00`)
    .lte("entry_time", `${todayStr}T23:59:59`);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const todayTrades = trades ?? [];
  const closedTrades = todayTrades.filter((t: any) => t.status === "closed" && t.pnl != null);

  const netPnl = closedTrades.reduce((s: number, t: any) => s + (t.pnl ?? 0), 0);
  const wins   = closedTrades.filter((t: any) => (t.pnl ?? 0) > 0).length;
  const losses = closedTrades.filter((t: any) => (t.pnl ?? 0) <= 0).length;
  const winRate = closedTrades.length > 0 ? Math.round((wins / closedTrades.length) * 100) : 0;
  const bestTrade = closedTrades.length > 0
    ? Math.max(...closedTrades.map((t: any) => t.pnl ?? 0))
    : 0;

  // Format values for email
  const pnlStr  = `${netPnl >= 0 ? "+" : ""}$${Math.abs(netPnl).toFixed(2)}`;
  const dateStr = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const emoji   = netPnl > 0 ? "🟢" : netPnl < 0 ? "🔴" : "⚪";

  // Build email HTML
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #efece4; color: #1c1a15; margin: 0; padding: 20px; }
    .container { max-width: 520px; margin: 0 auto; background: #f6f3e9; border: 1px solid #d8d3c4; border-radius: 16px; overflow: hidden; }
    .header { background: #1c1a15; padding: 28px 32px; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 700; color: white; }
    .header p { margin: 4px 0 0; font-size: 13px; color: rgba(255,255,255,0.7); }
    .body { padding: 28px 32px; }
    .pnl { font-size: 36px; font-weight: 800; font-family: 'SF Mono', monospace; margin: 0 0 4px; }
    .pnl.positive { color: #34d399; }
    .pnl.negative { color: #fb7185; }
    .pnl.neutral   { color: #94a3b8; }
    .divider { height: 1px; background: #1e293b; margin: 20px 0; }
    .stats { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .stat { background: #1a1a24; border: 1px solid #1e293b; border-radius: 10px; padding: 14px; }
    .stat-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; font-weight: 700; margin: 0 0 4px; }
    .stat-value { font-size: 18px; font-weight: 700; font-family: monospace; margin: 0; }
    .no-trades { text-align: center; padding: 20px; color: #64748b; font-size: 14px; }
    .footer { padding: 16px 32px; border-top: 1px solid #1e293b; }
    .footer p { margin: 0; font-size: 11px; color: #475569; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⚡ Velox Daily Summary</h1>
      <p>${dateStr}</p>
    </div>
    <div class="body">
      ${closedTrades.length === 0 ? `
        <div class="no-trades">
          <p style="font-size: 32px; margin: 0 0 8px">😴</p>
          <p>No closed trades today.</p>
          <p style="font-size: 12px; color: #475569;">Rest days are part of the process.</p>
        </div>
      ` : `
        <p class="pnl ${netPnl > 0 ? "positive" : netPnl < 0 ? "negative" : "neutral"}">${emoji} ${pnlStr}</p>
        <p style="color: #64748b; font-size: 13px; margin: 0 0 20px">${closedTrades.length} trade${closedTrades.length !== 1 ? "s" : ""} closed today</p>

        <div class="divider"></div>

        <div class="stats">
          <div class="stat">
            <p class="stat-label">Trades</p>
            <p class="stat-value" style="color: #e2e8f0">${closedTrades.length}</p>
          </div>
          <div class="stat">
            <p class="stat-label">Win Rate</p>
            <p class="stat-value" style="color: #3f6b46">${winRate}%</p>
          </div>
          <div class="stat">
            <p class="stat-label">Wins / Losses</p>
            <p class="stat-value"><span style="color:#34d399">${wins}W</span> / <span style="color:#fb7185">${losses}L</span></p>
          </div>
          <div class="stat">
            <p class="stat-label">Best Trade</p>
            <p class="stat-value" style="color: #34d399">+$${bestTrade.toFixed(2)}</p>
          </div>
        </div>
      `}
    </div>
    <div class="footer">
      <p>Velox Studio · Your personal trading OS · <a href="https://veloxstudioapp.vercel.app/dashboard" style="color: #1c1a15; font-weight: bold;">Open Dashboard</a></p>
    </div>
  </div>
</body>
</html>
`;

  // Send via Resend
  const resendRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [EMAIL_TO],
      subject: `Velox Daily — ${dateStr} · ${pnlStr} · ${closedTrades.length} trades`,
      html,
    }),
  });

  if (!resendRes.ok) {
    const err = await resendRes.text();
    return NextResponse.json({ error: err }, { status: 500 });
  }

  return NextResponse.json({ success: true, trades: closedTrades.length, pnl: netPnl });
}
