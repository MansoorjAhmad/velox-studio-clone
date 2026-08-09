"use client";

import { useEffect, useState } from "react";
import { PageTransition } from "@/components/ui/motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, AlertCircle, RefreshCw, Filter, Globe } from "lucide-react";
import { type EconomicEvent } from "@/lib/market/economic-calendar";
import { cn } from "@/lib/utils";

export default function EconomicCalendarPage() {
  const [events, setEvents] = useState<EconomicEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterImpact, setFilterImpact] = useState<"all" | "high" | "medium">("all");
  const [filterCountry, setFilterCountry] = useState<string>("all");

  const fetchCalendar = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/market/calendar");
      if (res.ok) {
        const d = await res.json();
        setEvents(d.events ?? []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendar();
  }, []);

  const filteredEvents = events.filter((e) => {
    if (filterImpact !== "all" && e.impact !== filterImpact) return false;
    if (filterCountry !== "all" && e.country !== filterCountry) return false;
    return true;
  });

  return (
    <PageTransition className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-brand/10 border border-brand/20 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-brand" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-medium tracking-tight">Economic Calendar</h1>
            <p className="text-sm text-foreground-muted">
              High-impact macroeconomic releases, central bank decisions, and inflation reports.
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchCalendar}
          disabled={loading}
          className="gap-2"
        >
          <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
          <span>Refresh Data</span>
        </Button>
      </div>

      {/* Filter Toolbar */}
      <Card>
        <CardContent className="p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-foreground-subtle" />
            <span className="text-xs font-semibold uppercase tracking-wider text-foreground-subtle">
              Filters:
            </span>

            <div className="flex items-center gap-1.5 ml-2">
              {(["all", "high", "medium"] as const).map((imp) => (
                <button
                  key={imp}
                  onClick={() => setFilterImpact(imp)}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
                    filterImpact === imp
                      ? "bg-brand text-brand-foreground font-semibold"
                      : "bg-surface-2 text-foreground-muted hover:text-foreground"
                  )}
                >
                  {imp === "all" ? "All Impacts" : imp === "high" ? "🔴 High Impact" : "🟠 Medium Impact"}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Globe className="w-3.5 h-3.5 text-foreground-subtle" />
            <select
              value={filterCountry}
              onChange={(e) => setFilterCountry(e.target.value)}
              className="bg-surface-2 border border-border/80 rounded-md text-xs px-2.5 py-1 font-mono text-foreground focus:outline-none"
            >
              <option value="all">All Currencies / Economies</option>
              <option value="US">USD — United States</option>
              <option value="EU">EUR — Eurozone</option>
              <option value="GB">GBP — Great Britain</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Events Table / Card Feed */}
      <Card className="card-hover">
        <CardHeader className="pb-3">
          <CardTitle className="font-display font-medium text-lg">
            Scheduled Economic Releases ({filteredEvents.length})
          </CardTitle>
          <CardDescription>
            Times are rendered in UTC. High impact events can trigger volatility spikes.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-2">
          {loading ? (
            <div className="py-12 text-center text-sm text-foreground-subtle flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-brand" />
              <span>Fetching live macroeconomic feed...</span>
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="py-12 text-center text-sm text-foreground-subtle">
              No economic events matching current filters.
            </div>
          ) : (
            <div className="space-y-2">
              {filteredEvents.map((evt) => (
                <div
                  key={evt.id}
                  className="p-3.5 rounded-lg bg-surface-2/60 border border-border/60 flex flex-col md:flex-row md:items-center justify-between gap-3 transition-colors hover:bg-surface-2"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        "w-2.5 h-2.5 rounded-full shrink-0",
                        evt.impact === "high"
                          ? "bg-loss animate-pulse"
                          : evt.impact === "medium"
                          ? "bg-warning"
                          : "bg-foreground-subtle"
                      )}
                    />
                    <Badge variant="outline" className="text-[10px] font-mono shrink-0">
                      {evt.country}
                    </Badge>
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">{evt.event}</h4>
                      <p className="text-[11px] font-mono text-foreground-muted">
                        {evt.date} · {evt.time} UTC
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs font-mono shrink-0 pl-5 md:pl-0 border-t md:border-t-0 pt-2 md:pt-0 border-border/40">
                    <div className="text-right">
                      <span className="text-[10px] text-foreground-subtle uppercase block">Actual</span>
                      <span className={cn("font-bold", evt.actual ? "text-profit" : "text-foreground-muted")}>
                        {evt.actual ?? "—"}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-foreground-subtle uppercase block">Forecast</span>
                      <span className="text-foreground">{evt.estimate ?? "—"}</span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-foreground-subtle uppercase block">Previous</span>
                      <span className="text-foreground-muted">{evt.prev ?? "—"}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </PageTransition>
  );
}
