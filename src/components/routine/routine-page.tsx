"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  getRoutineItems,
  getRoutineLogs,
  createRoutineItem,
  updateRoutineItem,
  deleteRoutineItem,
  toggleRoutineLog,
  seedRoutineIfEmpty,
  type RoutineItem,
  type RoutineLog,
  type RoutineCategory,
} from "@/lib/routine/actions";
import {
  CalendarCheck,
  CheckCircle2,
  Circle,
  Flame,
  Plus,
  Trash2,
  Edit2,
  Clock,
  Heart,
  Briefcase,
  TrendingUp,
  BookOpen,
  BookMarked,
  BarChart3,
  ListTodo,
  Award,
  Target,
  Calendar,
  Layers,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Default template (seeded on first visit) ──────────────────
const DEFAULT_TEMPLATE: { title: string; time_slot: string; category: RoutineCategory }[] = [
  { title: "Fajr Prayer & Morning Adhkar", time_slot: "05:00 AM", category: "deen" },
  { title: "Morning hydration (500ml water), stretching & 5-min mindfulness", time_slot: "06:30 AM", category: "life" },
  { title: "Morning workout / physical exercise session", time_slot: "07:15 AM", category: "life" },
  { title: "Quran Recitation (1-2 pages) & Reflection", time_slot: "07:45 AM", category: "deen" },
  { title: "Healthy breakfast & daily priorities review", time_slot: "08:15 AM", category: "life" },
  { title: "Pre-market technical analysis & economic news check", time_slot: "08:45 AM", category: "trading" },
  { title: "Core focus & trading window (Risk % calculation before entry)", time_slot: "09:30 AM", category: "trading" },
  { title: "Dhuhr Prayer & Lunch Reset", time_slot: "01:15 PM", category: "deen" },
  { title: "Deep work session / project tasks & skill development", time_slot: "02:30 PM", category: "work" },
  { title: "Asr Prayer & Evening Adhkar", time_slot: "05:00 PM", category: "deen" },
  { title: "Post-market trade journaling & MAE/MFE review", time_slot: "05:30 PM", category: "trading" },
  { title: "Maghrib Prayer & Family Dinner", time_slot: "07:15 PM", category: "deen" },
  { title: "Isha Prayer & Night Reflection", time_slot: "08:45 PM", category: "deen" },
  { title: "Read 15-20 pages of a book (Mindset / Philosophy / Business)", time_slot: "09:30 PM", category: "growth" },
  { title: "Screen-free wind down & 8-hour sleep prep", time_slot: "10:30 PM", category: "life" },
];

const CATEGORY_CONFIG: Record<RoutineCategory, { label: string; icon: React.ReactNode; badge: "info" | "brand" | "warning" | "profit" }> = {
  deen: { label: "Deen & Spirituality", icon: <BookMarked className="w-3.5 h-3.5 text-emerald-400" />, badge: "profit" },
  life: { label: "Life & Health", icon: <Heart className="w-3.5 h-3.5 text-rose-400" />, badge: "profit" },
  trading: { label: "Trading & Finance", icon: <TrendingUp className="w-3.5 h-3.5 text-brand" />, badge: "brand" },
  work: { label: "Work & Focus", icon: <Briefcase className="w-3.5 h-3.5 text-info" />, badge: "info" },
  growth: { label: "Growth & Mindset", icon: <BookOpen className="w-3.5 h-3.5 text-amber-400" />, badge: "warning" },
};

const CATEGORIES: RoutineCategory[] = ["deen", "life", "trading", "work", "growth"];
const todayKey = () => new Date().toISOString().split("T")[0];

export function RoutinePage() {
  const [items, setItems] = useState<RoutineItem[]>([]);
  const [logs, setLogs] = useState<RoutineLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mainTab, setMainTab] = useState<"checklist" | "analytics">("checklist");
  const [activeFilter, setActiveFilter] = useState<"all" | RoutineCategory>("all");
  const [timeframe, setTimeframe] = useState<"7D" | "30D" | "90D" | "1Y">("30D");

  // Add-item form state
  const [newTitle, setNewTitle] = useState("");
  const [newTime, setNewTime] = useState("08:00 AM");
  const [newCategory, setNewCategory] = useState<RoutineCategory>("deen");
  const [adding, setAdding] = useState(false);

  // Edit modal state
  const [editingItem, setEditingItem] = useState<RoutineItem | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editTime, setEditTime] = useState("");
  const [editCategory, setEditCategory] = useState<RoutineCategory>("deen");
  const [editSaving, setEditSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [itemsRes, logsRes] = await Promise.all([
      getRoutineItems(),
      getRoutineLogs(365), // fetch a year for analytics
    ]);

    if (itemsRes.error) {
      setError(itemsRes.error);
      setLoading(false);
      return;
    }

    let finalItems = itemsRes.data ?? [];

    // Seed default template if user has zero items
    if (finalItems.length === 0) {
      const seedRes = await seedRoutineIfEmpty(DEFAULT_TEMPLATE);
      if (seedRes.error) {
        setError(seedRes.error);
        setLoading(false);
        return;
      }
      const reloaded = await getRoutineItems();
      finalItems = reloaded.data ?? [];
    }

    setItems(finalItems);
    if (logsRes.error) {
      setError(logsRes.error);
    } else {
      setLogs(logsRes.data ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // ── Today's completion set ──
  const today = todayKey();
  const completedTodayIds = useMemo(() => {
    const set = new Set<string>();
    for (const log of logs) {
      if (log.log_date === today && log.item_id) set.add(log.item_id);
    }
    return set;
  }, [logs, today]);

  const completedCount = completedTodayIds.size;
  const totalCount = items.length;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // ── Toggle handler ──
  const handleToggle = async (item: RoutineItem) => {
    // Optimistic update
    const prev = logs;
    if (completedTodayIds.has(item.id)) {
      setLogs((l) => l.filter((x) => !(x.item_id === item.id && x.log_date === today)));
    } else {
      setLogs((l) => [
        ...l,
        { id: "optimistic", item_id: item.id, category: item.category, log_date: today, created_at: new Date().toISOString() },
      ]);
    }
    const res = await toggleRoutineLog(item.id, item.category);
    if (res.error) {
      setError(res.error);
      setLogs(prev); // revert
    }
  };

  // ── Add handler ──
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setAdding(true);
    const res = await createRoutineItem({
      title: newTitle.trim(),
      time_slot: newTime,
      category: newCategory,
      sort_order: items.length,
    });
    setAdding(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setNewTitle("");
    await load();
  };

  // ── Edit handlers ──
  const openEdit = (item: RoutineItem) => {
    setEditingItem(item);
    setEditTitle(item.title);
    setEditTime(item.time_slot ?? "");
    setEditCategory(item.category);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !editTitle.trim()) return;
    setEditSaving(true);
    const res = await updateRoutineItem(editingItem.id, {
      title: editTitle.trim(),
      time_slot: editTime.trim() || null,
      category: editCategory,
    });
    setEditSaving(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setEditingItem(null);
    await load();
  };

  const handleDelete = async (id: string) => {
    const res = await deleteRoutineItem(id);
    if (res.error) {
      setError(res.error);
      return;
    }
    await load();
  };

  const resetToDefaults = async () => {
    // Delete all items, then reload triggers seeding
    for (const item of items) {
      await deleteRoutineItem(item.id);
    }
    await load();
  };

  // ── Filtered checklist ──
  const filteredItems = useMemo(() => {
    if (activeFilter === "all") return items;
    return items.filter((i) => i.category === activeFilter);
  }, [items, activeFilter]);

  // ── REAL analytics (computed from logs) ──
  const analytics = useMemo(() => computeAnalytics(logs, items, timeframe), [logs, items, timeframe]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-lg bg-brand/10 border border-brand/20 flex items-center justify-center text-brand">
            <CalendarCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Daily Routine & Discipline Analytics</h1>
            <p className="text-sm text-foreground-muted">
              Track habits across Deen, Health, Trading, Work, and Growth — backed by real history.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-xs font-semibold">
            <Flame className="w-4 h-4 text-amber-400" />
            <span>Best Streak: {analytics.longestStreak} days</span>
          </div>
          <Button variant="ghost" size="sm" onClick={resetToDefaults} className="text-xs">
            Reset Defaults
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-danger/30 bg-danger/5">
          <CardContent className="py-3 text-sm text-danger flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </CardContent>
        </Card>
      )}

      {/* Main Tabs */}
      <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as "checklist" | "analytics")}>
        <TabsList className="mb-4">
          <TabsTrigger value="checklist" className="flex items-center gap-2">
            <ListTodo className="w-4 h-4" />
            <span>Today&apos;s Checklist</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            <span>Discipline Analytics</span>
          </TabsTrigger>
        </TabsList>

        {/* ══ TAB 1: CHECKLIST ══ */}
        <TabsContent value="checklist" className="space-y-6">
          {/* Progress bar */}
          <Card glass className="border-brand/20">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-foreground-subtle">
                    Today&apos;s Execution Progress
                  </span>
                  <div className="text-2xl font-extrabold text-foreground font-mono mt-0.5">
                    {completedCount} of {totalCount}{" "}
                    <span className="text-sm text-foreground-muted font-normal">
                      habits completed ({progressPct}%)
                    </span>
                  </div>
                </div>
                <Badge variant={progressPct === 100 ? "profit" : "brand"} className="text-xs font-bold px-3 py-1">
                  {progressPct === 100 ? "✓ Full Day Completed" : "Active Session"}
                </Badge>
              </div>
              <div className="h-2.5 w-full rounded-full bg-surface-3 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-400 via-brand to-profit transition-all duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Category filters */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveFilter("all")}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
                activeFilter === "all"
                  ? "bg-brand text-brand-foreground shadow-sm"
                  : "bg-surface-2 text-foreground-muted hover:text-foreground border border-border",
              )}
            >
              All Habits ({items.length})
            </button>
            {CATEGORIES.map((cat) => {
              const cfg = CATEGORY_CONFIG[cat];
              const count = items.filter((i) => i.category === cat).length;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveFilter(cat)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
                    activeFilter === cat
                      ? "bg-brand text-brand-foreground shadow-sm"
                      : "bg-surface-2 text-foreground-muted hover:text-foreground border border-border",
                  )}
                >
                  {cfg.icon}
                  <span>{cfg.label} ({count})</span>
                </button>
              );
            })}
          </div>

          {/* Add habit form */}
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Plus className="w-4 h-4 text-brand" />
                Add New Habit
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-3">
                <Input
                  placeholder="e.g. Quran recitation or 30-min walk"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="flex-1 bg-surface-2"
                />
                <Input
                  type="text"
                  placeholder="08:00 AM"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  className="w-full sm:w-28 bg-surface-2 font-mono text-xs"
                />
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as RoutineCategory)}
                  className="rounded-md border border-border bg-surface-2 px-3 py-2 text-xs font-medium text-foreground outline-none focus:border-brand"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{CATEGORY_CONFIG[c].label}</option>
                  ))}
                </select>
                <Button type="submit" size="sm" disabled={adding} className="font-semibold">
                  <Plus className="w-4 h-4" />
                  Add
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Checklist items */}
          <div className="space-y-3">
            {filteredItems.map((item) => {
              const cfg = CATEGORY_CONFIG[item.category];
              const done = completedTodayIds.has(item.id);
              return (
                <div
                  key={item.id}
                  onClick={() => handleToggle(item)}
                  className={cn(
                    "group flex items-center justify-between rounded-xl border p-4 transition-all duration-150 cursor-pointer",
                    done
                      ? "border-profit/30 bg-profit/5 opacity-85"
                      : "border-border bg-surface hover:border-brand/40 hover:bg-surface-2",
                  )}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    {done ? (
                      <CheckCircle2 className="w-5 h-5 text-profit shrink-0" />
                    ) : (
                      <Circle className="w-5 h-5 text-foreground-subtle group-hover:text-brand shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className={cn("text-sm font-medium transition-all", done && "line-through text-foreground-subtle")}>
                        {item.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {item.time_slot && (
                          <span className="text-[11px] font-mono text-foreground-subtle flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {item.time_slot}
                          </span>
                        )}
                        <Badge variant={cfg.badge} className="text-[9px] uppercase tracking-wider py-0 px-1.5 flex items-center gap-1">
                          {cfg.icon}
                          {cfg.label}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); openEdit(item); }}
                      className="p-1.5 rounded hover:bg-brand/10 text-foreground-subtle hover:text-brand"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                      className="p-1.5 rounded hover:bg-loss/10 text-foreground-subtle hover:text-loss"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>

        {/* ══ TAB 2: REAL ANALYTICS ══ */}
        <TabsContent value="analytics" className="space-y-6">
          {/* Timeframe selector */}
          <div className="flex items-center justify-between border-b border-border pb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-foreground-subtle flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-brand" />
              Historical Timeframe
            </span>
            <div className="flex items-center gap-1 bg-surface-2 p-1 rounded-lg border border-border">
              {(["7D", "30D", "90D", "1Y"] as const).map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={cn(
                    "px-2.5 py-1 text-xs font-bold rounded-md transition-all",
                    timeframe === tf
                      ? "bg-brand text-brand-foreground shadow-sm"
                      : "text-foreground-muted hover:text-foreground hover:bg-surface-3",
                  )}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>

          {/* Empty analytics state */}
          {analytics.totalLogged === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <BarChart3 className="w-10 h-10 text-foreground-subtle mx-auto mb-3" />
                <p className="text-sm font-medium">No history yet</p>
                <p className="text-xs text-foreground-muted mt-1">
                  Complete habits in the checklist tab to start building your discipline analytics.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* KPI cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card glass className="border-brand/20">
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-brand/15 flex items-center justify-center text-brand shrink-0">
                      <Award className="w-6 h-6" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-semibold text-foreground-subtle uppercase">{timeframe} Discipline</span>
                      <div className="text-2xl font-bold font-mono">{analytics.avgDiscipline}%</div>
                      <span className="text-[11px] text-foreground-muted">Avg completion rate</span>
                    </div>
                  </CardContent>
                </Card>

                <Card glass className="border-amber-500/20">
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-400 shrink-0">
                      <Flame className="w-6 h-6" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-semibold text-foreground-subtle uppercase">Current Streak</span>
                      <div className="text-2xl font-bold font-mono">{analytics.currentStreak} days</div>
                      <span className="text-[11px] text-foreground-muted">Active run (≥50%/day)</span>
                    </div>
                  </CardContent>
                </Card>

                <Card glass className="border-orange-500/20">
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-orange-500/15 flex items-center justify-center text-orange-400 shrink-0">
                      <Target className="w-6 h-6" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-semibold text-foreground-subtle uppercase">Peak Streak</span>
                      <div className="text-2xl font-bold font-mono">{analytics.longestStreak} days</div>
                      <span className="text-[11px] text-foreground-muted">All-time best run</span>
                    </div>
                  </CardContent>
                </Card>

                <Card glass className="border-emerald-500/20">
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-400 shrink-0">
                      <Layers className="w-6 h-6" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-semibold text-foreground-subtle uppercase">Total Logged</span>
                      <div className="text-2xl font-bold font-mono">{analytics.totalLogged.toLocaleString()}</div>
                      <span className="text-[11px] text-foreground-muted">Completions over {timeframe}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Category breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-brand" />
                    Category Performance ({timeframe})
                  </CardTitle>
                  <CardDescription>
                    How consistently you complete each category over the selected period.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {analytics.categoryStats.map((stat) => (
                    <div key={stat.category} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-medium">
                        <div className="flex items-center gap-2">
                          {CATEGORY_CONFIG[stat.category].icon}
                          <span>{CATEGORY_CONFIG[stat.category].label}</span>
                        </div>
                        <span className={cn(
                          "font-mono font-bold",
                          stat.pct >= 80 ? "text-profit" : stat.pct >= 50 ? "text-amber-400" : "text-loss",
                        )}>
                          {stat.pct}% · {stat.completed} completions
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-surface-3 overflow-hidden">
                        <div
                          className={cn(
                            "h-full transition-all duration-300",
                            stat.pct >= 80
                              ? "bg-gradient-to-r from-emerald-400 to-profit"
                              : stat.pct >= 50
                              ? "bg-gradient-to-r from-amber-500 to-amber-400"
                              : "bg-gradient-to-r from-loss/80 to-loss",
                          )}
                          style={{ width: `${stat.pct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Discipline trend chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-brand" />
                    {timeframe} Discipline Trend
                  </CardTitle>
                  <CardDescription>
                    Daily completion rate over the selected timeframe.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end justify-between h-44 gap-1 pt-4 px-2 overflow-x-auto">
                    {analytics.trendBars.map((d, i) => (
                      <div key={i} className="flex-1 min-w-[24px] flex flex-col items-center gap-2 h-full justify-end">
                        <span className="text-[9px] font-mono text-foreground-subtle font-semibold">{d.rate}%</span>
                        <div className="w-full max-w-[40px] bg-surface-3 rounded-t-md overflow-hidden flex items-end h-32">
                          <div
                            className="w-full bg-gradient-to-t from-brand via-info to-profit transition-all duration-300 rounded-t-md"
                            style={{ height: `${d.rate}%` }}
                          />
                        </div>
                        <span className="text-[9px] font-medium text-foreground-muted whitespace-nowrap">{d.label}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit modal */}
      {editingItem && (
        <Modal open={!!editingItem} onClose={() => setEditingItem(null)} title="Edit Habit">
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground-subtle uppercase">Habit Title</label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="e.g. Fajr Prayer & Adhkar"
                required
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground-subtle uppercase">Time Slot</label>
                <Input
                  value={editTime}
                  onChange={(e) => setEditTime(e.target.value)}
                  placeholder="08:00 AM"
                  className="font-mono text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground-subtle uppercase">Category</label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value as RoutineCategory)}
                  className="w-full h-10 rounded-md border border-border bg-surface-2 px-3 py-2 text-xs font-medium text-foreground outline-none focus:border-brand"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{CATEGORY_CONFIG[c].label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setEditingItem(null)}>Cancel</Button>
              <Button type="submit" disabled={editSaving} className="font-semibold">
                {editSaving ? "Saving…" : "Save Changes"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
//  ANALYTICS ENGINE — pure functions on real log data
// ════════════════════════════════════════════════════════════════

interface AnalyticsResult {
  totalLogged: number;
  avgDiscipline: number;
  longestStreak: number;
  currentStreak: number;
  categoryStats: { category: RoutineCategory; completed: number; total: number; pct: number }[];
  trendBars: { label: string; rate: number }[];
}

function daysForTimeframe(tf: string): number {
  switch (tf) {
    case "7D": return 7;
    case "30D": return 30;
    case "90D": return 90;
    case "1Y": return 365;
    default: return 30;
  }
}

function computeAnalytics(
  logs: RoutineLog[],
  items: RoutineItem[],
  timeframe: string,
): AnalyticsResult {
  const days = daysForTimeframe(timeframe);
  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - days);

  const totalItems = items.length || 1;

  // ── Group ALL logs by date (for streak over full history) ──
  const allLogsByDate = new Map<string, Set<string>>();
  for (const log of logs) {
    if (!allLogsByDate.has(log.log_date)) allLogsByDate.set(log.log_date, new Set());
    if (log.item_id) allLogsByDate.get(log.log_date)!.add(log.item_id);
  }

  // ── Timeframe-filtered logs ──
  const logsByDate = new Map<string, Set<string>>();
  for (const log of logs) {
    const logDate = new Date(log.log_date);
    if (logDate < cutoff) continue;
    if (!logsByDate.has(log.log_date)) logsByDate.set(log.log_date, new Set());
    if (log.item_id) logsByDate.get(log.log_date)!.add(log.item_id);
  }

  // ── Generate date range for selected timeframe (oldest → newest) ──
  const dateRange: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    dateRange.push(d.toISOString().split("T")[0]);
  }

  // ── Total completions in range ──
  let totalLogged = 0;
  let totalPossible = 0;
  const dailyRates: { date: string; rate: number }[] = [];

  for (const date of dateRange) {
    const completed = logsByDate.get(date)?.size ?? 0;
    totalLogged += completed;
    totalPossible += totalItems;
    const rate = totalItems > 0 ? Math.round((completed / totalItems) * 100) : 0;
    dailyRates.push({ date, rate });
  }

  // ── Avg discipline ──
  const avgDiscipline = totalPossible > 0 ? Math.round((totalLogged / totalPossible) * 100) : 0;

  // ── Streak — over FULL log history, threshold ≥50% of habits ──
  // Get all unique dates from all logs, sorted ascending
  const allDates = Array.from(allLogsByDate.keys()).sort();
  let longestStreak = 0;
  let curStreak = 0;
  let currentStreak = 0;
  const todayStr = now.toISOString().split("T")[0];

  // Walk consecutive calendar days (not just logged days) from oldest log to today
  if (allDates.length > 0) {
    const start = new Date(allDates[0]);
    const end = new Date(todayStr);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const key = d.toISOString().split("T")[0];
      const completed = allLogsByDate.get(key)?.size ?? 0;
      const pct = Math.round((completed / totalItems) * 100);
      if (pct >= 50) {
        curStreak++;
        longestStreak = Math.max(longestStreak, curStreak);
      } else {
        curStreak = 0;
      }
    }
    // currentStreak = the run ending today
    currentStreak = 0;
    for (let i = 0; ; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      const completed = allLogsByDate.get(key)?.size ?? 0;
      const pct = Math.round((completed / totalItems) * 100);
      if (pct >= 50) currentStreak++;
      else break;
      if (i > 730) break; // safety cap 2 years
    }
  }

  // ── Category breakdown ──
  const categoryStats = CATEGORIES.map((cat) => {
    const catItems = items.filter((i) => i.category === cat);
    const catCompleted = logs.filter(
      (l) => l.category === cat && new Date(l.log_date) >= cutoff,
    ).length;
    const possible = catItems.length * days;
    const pct = possible > 0 ? Math.round((catCompleted / possible) * 100) : 0;
    return { category: cat, completed: catCompleted, total: possible, pct };
  });

  // ── Trend bars (oldest → newest, correct time order) ──
  let trendBars: { label: string; rate: number }[] = [];

  if (timeframe === "7D") {
    // dailyRates is already oldest→newest; show each day
    trendBars = dailyRates.map((d) => ({
      label: new Date(d.date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short" }),
      rate: d.rate,
    }));
  } else if (timeframe === "1Y") {
    // 12 monthly buckets
    const monthMap = new Map<string, { total: number; count: number }>();
    for (const d of dailyRates) {
      const mk = d.date.slice(0, 7); // YYYY-MM
      if (!monthMap.has(mk)) monthMap.set(mk, { total: 0, count: 0 });
      const m = monthMap.get(mk)!;
      m.total += d.rate;
      m.count++;
    }
    trendBars = Array.from(monthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([mk, { total, count }]) => ({
        label: new Date(mk + "-01T00:00:00").toLocaleDateString("en-US", { month: "short" }),
        rate: Math.round(total / count),
      }));
  } else {
    // 30D → 4 weekly buckets, 90D → 3 monthly buckets
    const buckets = timeframe === "30D" ? 4 : 3;
    const bucketSize = Math.ceil(dailyRates.length / buckets);
    for (let b = 0; b < buckets; b++) {
      const slice = dailyRates.slice(b * bucketSize, (b + 1) * bucketSize);
      if (slice.length === 0) continue;
      const avg = Math.round(slice.reduce((s, d) => s + d.rate, 0) / slice.length);
      const firstDate = new Date(slice[0].date + "T00:00:00");
      const label = firstDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      trendBars.push({ label, rate: avg });
    }
  }

  return { totalLogged, avgDiscipline, longestStreak, currentStreak, categoryStats, trendBars };
}
