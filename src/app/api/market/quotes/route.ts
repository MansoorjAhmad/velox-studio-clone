import { NextResponse } from "next/server";
import { getMultipleQuotes } from "@/lib/market/twelve-data";

// Default symbols to show — user's most common pairs
const DEFAULT_SYMBOLS = ["EUR/USD", "GBP/USD", "XAU/USD", "US500", "NAS100"];

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const symbolsParam = searchParams.get("symbols");
  const symbols = symbolsParam
    ? symbolsParam.split(",").map((s) => s.trim())
    : DEFAULT_SYMBOLS;

  const quotes = await getMultipleQuotes(symbols);
  return NextResponse.json({ quotes });
}
