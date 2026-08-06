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

/** Fallback static events for when API key is not set */
function getFallbackEvents(): EconomicEvent[] {
  const today = new Date();
  const fmt = (d: Date) => d.toISOString().split("T")[0];

  const next = (daysAhead: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + daysAhead);
    return fmt(d);
  };

  return [
    { id: "fb-1", event: "Add your Finnhub API key to see live events", country: "US", date: next(0), time: "00:00:00", impact: "high", actual: null, estimate: null, prev: null, unit: "" },
    { id: "fb-2", event: "FOMC Meeting Minutes (example)", country: "US", date: next(2), time: "18:00:00", impact: "high", actual: null, estimate: null, prev: null, unit: "" },
    { id: "fb-3", event: "Non-Farm Payrolls (example)", country: "US", date: next(4), time: "13:30:00", impact: "high", actual: null, estimate: "185K", prev: "179K", unit: "K" },
    { id: "fb-4", event: "CPI (MoM) (example)", country: "US", date: next(5), time: "13:30:00", impact: "high", actual: null, estimate: "0.3%", prev: "0.2%", unit: "%" },
  ];
}
