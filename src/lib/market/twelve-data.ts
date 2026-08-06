/**
 * Twelve Data API client — live prices + OHLCV historical data.
 *
 * Free tier: 800 requests/day
 * Docs: https://twelvedata.com/docs
 *
 * Required env var: TWELVE_DATA_API_KEY
 */

const BASE = "https://api.twelvedata.com";
const KEY = process.env.TWELVE_DATA_API_KEY ?? "";

export interface LiveQuote {
  symbol: string;
  price: number;
  change: number;
  changePct: number;
  high: number;
  low: number;
  volume: number;
  timestamp: string;
}

export interface OHLCVCandle {
  datetime: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/** Fetch live price quote for a symbol (e.g. "EURUSD", "XAUUSD", "AAPL") */
export async function getLiveQuote(symbol: string): Promise<LiveQuote | null> {
  if (!KEY) return null;
  try {
    const res = await fetch(
      `${BASE}/quote?symbol=${encodeURIComponent(symbol)}&apikey=${KEY}`,
      { next: { revalidate: 300 } }, // cache 5 minutes
    );
    if (!res.ok) return null;
    const d = await res.json();
    if (d.status === "error") return null;
    return {
      symbol: d.symbol,
      price: parseFloat(d.close),
      change: parseFloat(d.change),
      changePct: parseFloat(d.percent_change),
      high: parseFloat(d.fifty_two_week?.high ?? d.high ?? "0"),
      low: parseFloat(d.fifty_two_week?.low ?? d.low ?? "0"),
      volume: parseInt(d.volume ?? "0"),
      timestamp: d.timestamp,
    };
  } catch {
    return null;
  }
}

/** Fetch multiple quotes in one call */
export async function getMultipleQuotes(symbols: string[]): Promise<LiveQuote[]> {
  if (!KEY || symbols.length === 0) return [];
  try {
    const joined = symbols.join(",");
    const res = await fetch(
      `${BASE}/quote?symbol=${encodeURIComponent(joined)}&apikey=${KEY}`,
      { next: { revalidate: 300 } },
    );
    if (!res.ok) return [];
    const d = await res.json();

    // If single symbol, API returns object not array
    if (!Array.isArray(d)) {
      const q = await getLiveQuote(symbols[0]);
      return q ? [q] : [];
    }

    return d
      .filter((item: any) => item.status !== "error")
      .map((item: any) => ({
        symbol: item.symbol,
        price: parseFloat(item.close),
        change: parseFloat(item.change),
        changePct: parseFloat(item.percent_change),
        high: parseFloat(item.high ?? "0"),
        low: parseFloat(item.low ?? "0"),
        volume: parseInt(item.volume ?? "0"),
        timestamp: item.timestamp,
      }));
  } catch {
    return [];
  }
}

/** Fetch OHLCV historical candles for backtest */
export async function getOHLCV(
  symbol: string,
  interval: "1day" | "1week" | "1month" = "1day",
  outputsize = 365,
): Promise<OHLCVCandle[]> {
  if (!KEY) return [];
  try {
    const res = await fetch(
      `${BASE}/time_series?symbol=${encodeURIComponent(symbol)}&interval=${interval}&outputsize=${outputsize}&apikey=${KEY}`,
      { next: { revalidate: 3600 } }, // cache 1 hour
    );
    if (!res.ok) return [];
    const d = await res.json();
    if (d.status === "error" || !d.values) return [];

    return d.values.map((v: any) => ({
      datetime: v.datetime,
      open: parseFloat(v.open),
      high: parseFloat(v.high),
      low: parseFloat(v.low),
      close: parseFloat(v.close),
      volume: parseInt(v.volume ?? "0"),
    }));
  } catch {
    return [];
  }
}
