import { NextResponse } from "next/server";
import { getEconomicCalendar } from "@/lib/market/economic-calendar";
import { isRateLimited, requestClientKey } from "@/lib/server/rate-limit";

export async function GET(req: Request) {
  if (isRateLimited(`calendar:${requestClientKey(req)}`, 30, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  const events = await getEconomicCalendar(7);
  return NextResponse.json({ events });
}
