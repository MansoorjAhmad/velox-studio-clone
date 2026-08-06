import { NextResponse } from "next/server";
import { getEconomicCalendar } from "@/lib/market/economic-calendar";

export async function GET() {
  const events = await getEconomicCalendar(7);
  return NextResponse.json({ events });
}
