"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getTimeEntries,
  startTimer,
  stopTimer,
  deleteTimeEntry,
} from "@/lib/time/actions";
import { TIME_CATEGORIES, type TimeEntry } from "@/lib/time/types";
import {
  Clock,
  Play,
  Square,
  Trash2,
  Inbox,
  Timer,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function TimePage() {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active (running) timer form state.
  const [category, setCategory] = useState<string>("Trading");
  const [description, setDescription] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeStart, setActiveStart] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [toggling, setToggling] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await getTimeEntries();
    if (res.error) setError(res.error);
    setEntries(res.data ?? []);
    setLoading(false);

    // Detect a running timer (end_time is null).
    const running = res.data?.find((e) => !e.end_time);
    if (running) {
      setActiveId(running.id);
      setActiveStart(new Date(running.start_time).getTime());
      setCategory(running.category);
      setDescription(running.description ?? "");
    } else {
      setActiveId(null);
      setActiveStart(null);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Tick every second while a timer is running.
  useEffect(() => {
    if (!activeStart) {
      setElapsed(0);
      return;
    }
    const tick = () => setElapsed(Math.floor((Date.now() - activeStart) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [activeStart]);

  const handleToggle = async () => {
    setToggling(true);
    if (activeId) {
      await stopTimer(activeId);
      setActiveId(null);
      setActiveStart(null);
      setDescription("");
    } else {
      const res = await startTimer(category, description);
      if (res.id) {
        setActiveId(res.id);
        setActiveStart(Date.now());
      } else if (res.error) {
        setError(res.error);
      }
    }
    setToggling(false);
    load();
  };

  // Weekly summary.
  const weekSummary = useMemo(() => {
    const now = new Date();
    const day = now.getDay() || 7;
    const monday = new Date(now);
    monday.setDate(now.getDate() - day + 1);
    monday.setHours(0, 0, 0, 0);
    const mondayMs = monday.getTime();

    const byCat = new Map<string, number>();
    for (const e of entries) {
      if (!e.duration_minutes) continue;
      if (new Date(e.start_time).getTime() < mondayMs) continue;
      byCat.set(e.category, (byCat.get(e.category) ?? 0) + e.duration_minutes);
    }
    const total = Array.from(byCat.values()).reduce((s, x) => s + x, 0);
    return { byCat, total };
  }, [entries]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-brand/10 flex items-center justify-center">
            <Clock className="w-5 h-5 text-brand" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Time Tracking</h1>
            <p className="text-sm text-foreground-muted">
              Track how you spend your hours.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <Card className="border-danger/30 bg-danger/5">
          <CardContent className="py-3 text-sm text-danger">{error}</CardContent>
        </Card>
      )}

      {/* Timer card */}
      <Card glass className="border-brand/20">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            {/* Elapsed display */}
            <div className="flex items-center gap-3 flex-1">
              <div
                className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center",
                  activeId ? "bg-profit/15 text-profit" : "bg-surface-2 text-foreground-subtle",
                )}
              >
                <Timer className="w-6 h-6" />
              </div>
              <div>
                <p className="text-3xl font-bold tabular tracking-tight">
                  {formatDuration(elapsed)}
                </p>
                <p className="text-xs text-foreground-subtle">
                  {activeId ? "Recording…" : "Ready to start"}
                </p>
              </div>
            </div>

            {/* Category + description */}
            <div className="flex flex-1 gap-2">
              <Select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={!!activeId}
                className="w-auto"
              >
                {TIME_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
              <Input
                placeholder="What are you working on?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={!!activeId}
              />
            </div>

            {/* Toggle button */}
            <Button
              onClick={handleToggle}
              variant={activeId ? "danger" : "primary"}
              size="lg"
              disabled={toggling}
              className="md:w-32"
            >
              {activeId ? (
                <>
                  <Square className="w-4 h-4" />
                  Stop
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Start
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Weekly summary */}
      {!loading && weekSummary.total > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">This Week</CardTitle>
            <CardDescription>
              {formatMinutes(weekSummary.total)} tracked across {weekSummary.byCat.size}{" "}
              {weekSummary.byCat.size === 1 ? "category" : "categories"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Array.from(weekSummary.byCat.entries())
                .sort((a, b) => b[1] - a[1])
                .map(([cat, mins]) => {
                  const pct = (mins / weekSummary.total) * 100;
                  return (
                    <div key={cat} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>{cat}</span>
                        <span className="tabular text-foreground-muted">
                          {formatMinutes(mins)} ({pct.toFixed(0)}%)
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-surface-3 overflow-hidden">
                        <div
                          className="h-full bg-brand"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent entries */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : entries.filter((e) => e.end_time).length === 0 ? (
            <div className="py-8 text-center">
              <Inbox className="w-8 h-8 text-foreground-subtle mx-auto mb-2" />
              <p className="text-sm text-foreground-muted">No completed sessions yet</p>
            </div>
          ) : (
            <div className="space-y-1">
              {entries
                .filter((e) => e.end_time)
                .map((e) => (
                  <div
                    key={e.id}
                    className="flex items-center justify-between py-2.5 border-b border-border/50 last:border-0 group"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <Badge variant="default" className="shrink-0">
                        {e.category}
                      </Badge>
                      <div className="min-w-0">
                        <p className="text-sm truncate">
                          {e.description ?? "No description"}
                        </p>
                        <p className="text-xs text-foreground-subtle">
                          {new Date(e.start_time).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}{" "}
                          ·{" "}
                          {new Date(e.start_time).toLocaleTimeString("en-US", {
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-3">
                      <span className="text-sm tabular font-medium">
                        {formatMinutes(e.duration_minutes ?? 0)}
                      </span>
                      <button
                        onClick={async () => {
                          await deleteTimeEntry(e.id);
                          load();
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded hover:bg-loss/10 text-foreground-subtle hover:text-loss"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatMinutes(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}
