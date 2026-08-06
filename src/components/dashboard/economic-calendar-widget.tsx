"use client";

/**
 * EconomicCalendarWidget — shows upcoming high-impact macro events.
 * Fetches from /api/market/calendar (Finnhub, server-side key).
 * Shows today, tomorrow, and this week sections.
 */

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface EconomicEvent {
  id: string;
  event: string;
  country: string;
  date: string;
  time: string;
  impact: "high" | "medium" | "low";
  actual: string | null;
  estimate: string | null;
  prev: string | null;
  unit: string;
}

const IMPACT_COLOR = {
  high:   { dot: "bg-loss",    badge: "border-loss/30 text-loss bg-loss/8",    label: "High" },
  medium: { dot: "bg-amber-400", badge: "border-amber-400/30 text-amber-400 bg-amber-400/8", label: "Med" },
  low:    { dot: "bg-border",  badge: "border-border text-foreground-subtle",  label: "Low" },
};

const COUNTRY_FLAG: Record<string, string> = {
  US: "🇺🇸", EU: "🇪🇺", GB: "🇬🇧", JP: "🇯🇵", CA: "🇨🇦", AU: "🇦🇺", NZ: "🇳🇿", CH: "🇨🇭",
};

function formatEventTime(dateStr: string, timeStr: string): string {
  try {
    const dt = new Date(`${dateStr}T${timeStr}Z`);
    return dt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" }) + " UTC";
  } catch {
    return timeStr;
  }
}

function getSection(dateStr: string): "today" | "tomorrow" | "week" {
  const today = new Date().toISOString().split("T")[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];
  if (dateStr === today) return "today";
  if (dateStr === tomorrow) return "tomorrow";
  return "week";
}

export function EconomicCalendarWidget() {
  const [events, setEvents] = useState<EconomicEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/market/calendar")
      .then((r) => r.json())
      .then((d) => { setEvents(d.events ?? []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const todayEvents    = events.filter((e) => getSection(e.date) === "today");
  const tomorrowEvents = events.filter((e) => getSection(e.date) === "tomorrow");
  const weekEvents     = events.filter((e) => getSection(e.date) === "week");

  const highImpactToday = todayEvents.filter((e) => e.impact === "high").length;

  return (
    <Card className="card-hover">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-brand" />
          Economic Calendar
          {highImpactToday > 0 && (
            <Badge variant="loss" className="text-[9px] ml-1">
              {highImpactToday} high impact today
            </Badge>
          )}
        </CardTitle>
        <CardDescription>Upcoming macro events · NFP · FOMC · CPI</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="space-y-2">
            {[1,2,3].map((i) => (
              <div key={i} className="h-12 rounded-lg bg-surface-2/40 animate-pulse" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <p className="text-xs text-foreground-subtle text-center py-4">No events found.</p>
        ) : (
          <>
            {todayEvents.length > 0 && (
              <EventSection label="Today" events={todayEvents} />
            )}
            {tomorrowEvents.length > 0 && (
              <EventSection label="Tomorrow" events={tomorrowEvents} />
            )}
            {weekEvents.length > 0 && (
              <EventSection label="This Week" events={weekEvents.slice(0, 6)} />
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function EventSection({ label, events }: { label: string; events: EconomicEvent[] }) {
  return (
    <div>
      <p className="text-[9px] font-bold uppercase tracking-widest text-foreground-subtle mb-1.5">{label}</p>
      <div className="space-y-1.5">
        {events.map((e) => {
          const style = IMPACT_COLOR[e.impact];
          const flag  = COUNTRY_FLAG[e.country] ?? "🌐";
          return (
            <div
              key={e.id}
              className="flex items-start gap-2.5 p-2.5 rounded-lg border border-border/60 bg-surface-2/20 hover:bg-surface-2/40 transition-colors"
            >
              {/* Impact dot */}
              <div className={cn("w-2 h-2 rounded-full shrink-0 mt-1", style.dot)} />

              {/* Event info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px]">{flag}</span>
                  <p className="text-xs font-semibold text-foreground truncate">{e.event}</p>
                  <Badge variant="outline" className={cn("text-[8px] border shrink-0", style.badge)}>
                    {style.label}
                  </Badge>
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <Clock className="w-2.5 h-2.5 text-foreground-subtle/60" />
                  <span className="text-[9px] text-foreground-subtle font-mono">
                    {formatEventTime(e.date, e.time)}
                  </span>
                  {e.estimate && (
                    <span className="text-[9px] text-foreground-subtle ml-2">
                      est: <span className="text-brand font-mono">{e.estimate}{e.unit}</span>
                    </span>
                  )}
                  {e.prev && (
                    <span className="text-[9px] text-foreground-subtle">
                      · prev: <span className="font-mono">{e.prev}{e.unit}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Actual (if released) */}
              {e.actual && (
                <span className="text-[10px] font-mono font-bold text-profit shrink-0">
                  {e.actual}{e.unit}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
