import { NextResponse } from "next/server";
import { getMultipleQuotes } from "@/lib/market/twelve-data";
import { isRateLimited, requestClientKey } from "@/lib/server/rate-limit";

// Default symbols to show — user's most common pairs
const DEFAULT_SYMBOLS = ["EUR/USD", "GBP/USD", "XAU/USD", "US500", "NAS100"];
const ALLOWED_SYMBOLS = new Set(DEFAULT_SYMBOLS);

export async function GET(req: Request) {
  if (isRateLimited(`quotes:${requestClientKey(req)}`, 60, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  const { searchParams } = new URL(req.url);
  const symbolsParam = searchParams.get("symbols");
  const symbols = symbolsParam
    ? symbolsParam.split(",").map((s) => s.trim())
    : DEFAULT_SYMBOLS;
  if (symbols.length === 0 || symbols.length > DEFAULT_SYMBOLS.length || symbols.some((symbol) => !ALLOWED_SYMBOLS.has(symbol))) {
    return NextResponse.json({ error: "Invalid symbols" }, { status: 400 });
  }

  const quotes = await getMultipleQuotes(symbols);
  return NextResponse.json({ quotes });
}
