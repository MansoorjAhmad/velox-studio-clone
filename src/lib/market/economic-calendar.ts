/**
 * Economic Calendar — powered by Finnhub API (free tier).
 *
 * Free tier: unlimited for economic calendar
 * Docs: https://finnhub.io/docs/api/economic-calendar
 *
 * Required env var: FINNHUB_API_KEY
 */

const BASE = "https://finnhub.io/api/v1";
const KEY = process.env.FINNHUB_API_KEY ?? "";

export interface EconomicEvent {
  id: string;
  event: string;
  country: string;
  date: string;       // "2024-08-06"
  time: string;       // "08:30:00" UTC
  impact: "high" | "medium" | "low";
  actual: string | null;
  estimate: string | null;
  prev: string | null;
  unit: string;
}

const HIGH_IMPACT_KEYWORDS = [
  "nfp", "non-farm", "fomc", "federal reserve", "fed rate", "interest rate decision",
  "cpi", "inflation", "gdp", "unemployment", "payroll", "ecb", "boe", "rba", "boj",
  "pce", "retail sales", "pmi", "ism",
];

function inferImpact(eventName: string): "high" | "medium" | "low" {
  const lower = eventName.toLowerCase();
  if (HIGH_IMPACT_KEYWORDS.some((k) => lower.includes(k))) return "high";
  if (lower.includes("trade balance") || lower.includes("housing") || lower.includes("durable")) return "medium";
  return "low";
}

/** Fetch upcoming economic events for the next N days */
export async function getEconomicCalendar(days = 7): Promise<EconomicEvent[]> {
  if (!KEY) return getFallbackEvents();

  const from = new Date().toISOString().split("T")[0];
  const toDate = new Date(Date.now() + days * 86400000);
  const to = toDate.toISOString().split("T")[0];

  try {
    const res = await fetch(
      `${BASE}/calendar/economic?from=${from}&to=${to}&token=${KEY}`,
      { next: { revalidate: 3600 } }, // cache 1 hour
    );
    if (!res.ok) return getFallbackEvents();
    const d = await res.json();
    if (!d.economicCalendar) return getFallbackEvents();

    return d.economicCalendar
      .filter((e: any) => e.country === "US" || e.country === "EU" || e.country === "GB")
      .map((e: any, i: number) => ({
        id: `${e.country}-${e.event}-${i}`,
        event: e.event ?? "Unknown Event",
        country: e.country ?? "US",
        date: e.time?.split(" ")[0] ?? from,
        time: e.time?.split(" ")[1] ?? "00:00:00",
        impact: inferImpact(e.event ?? ""),
        actual: e.actual ?? null,
        estimate: e.estimate ?? null,
        prev: e.prev ?? null,
        unit: e.unit ?? "",
      }))
      .sort((a: EconomicEvent, b: EconomicEvent) =>
        new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime()
      );
  } catch {
    return getFallbackEvents();
  }
}

/** Fallback realistic events for when API key is not set or rate limited */
function getFallbackEvents(): EconomicEvent[] {
  const today = new Date();
  const fmt = (d: Date) => d.toISOString().split("T")[0];

  const next = (daysAhead: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + daysAhead);
    return fmt(d);
  };

  return [
    { id: "fb-1", event: "US Core CPI Inflation Rate (MoM)", country: "US", date: next(0), time: "12:30:00", impact: "high", actual: "0.3%", estimate: "0.3%", prev: "0.2%", unit: "%" },
    { id: "fb-2", event: "US Initial Unemployment Claims", country: "US", date: next(1), time: "12:30:00", impact: "medium", actual: "218K", estimate: "220K", prev: "225K", unit: "K" },
    { id: "fb-3", event: "EU ECB Interest Rate Decision", country: "EU", date: next(2), time: "13:15:00", impact: "high", actual: "3.75%", estimate: "3.75%", prev: "4.00%", unit: "%" },
    { id: "fb-4", event: "US Non-Farm Payrolls (NFP)", country: "US", date: next(3), time: "12:30:00", impact: "high", actual: null, estimate: "185K", prev: "179K", unit: "K" },
    { id: "fb-5", event: "US Unemployment Rate", country: "US", date: next(3), time: "12:30:00", impact: "high", actual: null, estimate: "4.1%", prev: "4.1%", unit: "%" },
    { id: "fb-6", event: "UK BOE Official Bank Rate", country: "GB", date: next(4), time: "11:00:00", impact: "high", actual: null, estimate: "5.00%", prev: "5.25%", unit: "%" },
    { id: "fb-7", event: "US FOMC Press Conference", country: "US", date: next(5), time: "18:30:00", impact: "high", actual: null, estimate: "5.25%", prev: "5.25%", unit: "%" },
    { id: "fb-8", event: "US ISM Manufacturing PMI", country: "US", date: next(6), time: "14:00:00", impact: "medium", actual: null, estimate: "49.5", prev: "48.5", unit: "pts" },
  ];
}
