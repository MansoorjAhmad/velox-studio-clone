"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
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
  XCircle,
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
  Sparkles,
  Check,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Default template (seeded on first visit) ──────────────────
const DEFAULT_TEMPLATE: { title: string; time_slot: string; category: RoutineCategory }[] = [
  { title: "Fajr Prayer & Morning Adhkar", time_slot: "05:00 AM", category: "deen" },
  { title: "Morning hydration (500ml water) & 5-min stretch", time_slot: "06:30 AM", category: "life" },
  { title: "Morning workout / physical exercise session", time_slot: "07:15 AM", category: "life" },
  { title: "Quran Recitation (1-2 pages) & Reflection", time_slot: "07:45 AM", category: "deen" },
  { title: "Healthy breakfast & daily priorities review", time_slot: "08:15 AM", category: "life" },
  { title: "Pre-market technical analysis & news check", time_slot: "08:45 AM", category: "trading" },
  { title: "Core focus & trading window (Risk % check before entry)", time_slot: "09:30 AM", category: "trading" },
  { title: "Dhuhr Prayer & Lunch Reset", time_slot: "01:15 PM", category: "deen" },
  { title: "Deep work session / project tasks", time_slot: "02:30 PM", category: "work" },
  { title: "Asr Prayer & Evening Adhkar", time_slot: "05:00 PM", category: "deen" },
  { title: "Post-market trade journaling & MAE/MFE review", time_slot: "05:30 PM", category: "trading" },
  { title: "Maghrib Prayer & Family Dinner", time_slot: "07:15 PM", category: "deen" },
  { title: "Isha Prayer & Night Reflection", time_slot: "08:45 PM", category: "deen" },
  { title: "Read 15-20 pages of a book (Mindset / Philosophy)", time_slot: "09:30 PM", category: "growth" },
  { title: "Screen-free wind down & 8-hour sleep prep", time_slot: "10:30 PM", category: "life" },
];

const CATEGORY_CONFIG: Record<RoutineCategory, { label: string; icon: React.ReactNode; badge: "info" | "brand" | "warning" | "profit" }> = {
  deen: { label: "Deen & Spirituality", icon: <BookMarked className="w-3.5 h-3.5 text-emerald-400" />, badge: "profit" },
  life: { label: "Life & Health", icon: <Heart className="w-3.5 h-3.5 text-rose-400" />, badge: "profit" },
  trading: { label: "Trading & Finance", icon: <TrendingUp className="w-3.5 h-3.5 text-brand" />, badge: "brand" },
  work: { label: "Work & Focus", icon: <Briefcase className="w-3.5 h-3.5 text-info" />, badge: "info" },
  growth: { label: "Growth & Mindset", icon: <BookOpen className="w-3.5 h-3.5 text-warning" />, badge: "warning" },
};

const CATEGORIES: RoutineCategory[] = ["deen", "life", "trading", "work", "growth"];
const todayKey = () => new Date().toISOString().split("T")[0];

export function RoutinePage() {
  const [items, setItems] = useState<RoutineItem[]>([]);
  const [logs, setLogs] = useState<RoutineLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<"all" | RoutineCategory>("all");

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
      getRoutineLogs(365),
    ]);

    if (itemsRes.error) {
      setError(itemsRes.error);
      setLoading(false);
      return;
    }

    let finalItems = itemsRes.data ?? [];
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

  // Today's log status mapping: itemId -> 'completed' | 'not_done'
  const today = todayKey();
  const todayStatusMap = useMemo(() => {
    const map = new Map<string, "completed" | "not_done">();
    for (const log of logs) {
      if (log.log_date === today && log.item_id) {
        // default to completed
        map.set(log.item_id, (log as any).status === "not_done" ? "not_done" : "completed");
      }
    }
    return map;
  }, [logs, today]);

  const completedTodayCount = useMemo(() => {
    let count = 0;
    for (const [, status] of todayStatusMap.entries()) {
      if (status === "completed") count++;
    }
    return count;
  }, [todayStatusMap]);

  const notDoneTodayCount = useMemo(() => {
    let count = 0;
    for (const [, status] of todayStatusMap.entries()) {
      if (status === "not_done") count++;
    }
    return count;
  }, [todayStatusMap]);

  const totalCount = items.length;
  const progressPct = totalCount > 0 ? Math.round((completedTodayCount / totalCount) * 100) : 0;

  // Toggle explicit status: Unmarked -> Done -> Not Done -> Unmarked
  const handleToggleStatus = async (item: RoutineItem, targetStatus: "completed" | "not_done") => {
    const current = todayStatusMap.get(item.id);
    const prevLogs = logs;

    if (current === targetStatus) {
      // Remove log (unmark)
      setLogs((l) => l.filter((x) => !(x.item_id === item.id && x.log_date === today)));
      const res = await toggleRoutineLog(item.id, item.category);
      if (res.error) setError(res.error);
    } else {
      // Set to target status
      setLogs((l) => [
        ...l.filter((x) => !(x.item_id === item.id && x.log_date === today)),
        {
          id: "optimistic",
          item_id: item.id,
          category: item.category,
          log_date: today,
          created_at: new Date().toISOString(),
          status: targetStatus,
        } as any,
      ]);
      const res = await toggleRoutineLog(item.id, item.category);
      if (res.error) {
        setError(res.error);
        setLogs(prevLogs);
      }
    }
  };

  // Add handler
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
      toast.error("Couldn't add item", { description: res.error });
      return;
    }
    setNewTitle("");
    toast.success("Routine item added", { description: newTitle.trim() });
    await load();
  };

  // Edit handlers
  const openEdit = (item: RoutineItem) => {
    setEditingItem(item);
    setEditTitle(item.title);
    setEditTime(item.time_slot ?? "");
    setEditCategory(item.category);
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !editTitle.trim()) return;
    setEditSaving(true);
    const res = await updateRoutineItem(editingItem.id, {
      title: editTitle.trim(),
      time_slot: editTime,
      category: editCategory,
    });
    setEditSaving(false);
    if (res.error) {
      setError(res.error);
      toast.error("Couldn't save changes", { description: res.error });
      return;
    }
    setEditingItem(null);
    toast.success("Routine item updated");
    await load();
  };

  const handleDelete = async (id: string) => {
    const res = await deleteRoutineItem(id);
    if (res.error) {
      setError(res.error);
      toast.error("Delete failed", { description: res.error });
    } else {
      toast.success("Routine item removed");
      await load();
    }
  };

  const filteredItems = useMemo(() => {
    if (activeFilter === "all") return items;
    return items.filter((i) => i.category === activeFilter);
  }, [items, activeFilter]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-brand/10 flex items-center justify-center">
            <CalendarCheck className="w-5 h-5 text-brand" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Daily Routine</h1>
            <p className="text-sm text-foreground-muted">
              Execution & discipline tracking. Persistent habits.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <Card className="border-danger/30 bg-danger/5">
          <CardContent className="py-3 text-sm text-danger flex items-center justify-between">
            <span>{error}</span>
            <Button size="sm" variant="ghost" onClick={() => setError(null)}>
              Dismiss
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Progress Hero */}
      <Card className="border-brand/20 bg-brand/5">
        <CardContent className="p-5 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center md:text-left">
            <div className="flex items-center gap-2 justify-center md:justify-start">
              <Sparkles className="w-4 h-4 text-brand" />
              <h2 className="text-base font-bold">Today's Execution Progress</h2>
            </div>
            <p className="text-xs text-foreground-muted">
              {completedTodayCount} Completed · {notDoneTodayCount} Missed · {totalCount - completedTodayCount - notDoneTodayCount} Pending
            </p>
          </div>

          <div className="w-full md:w-64 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-profit">{progressPct}% Done</span>
              <span className="text-foreground-subtle">{completedTodayCount} / {totalCount}</span>
            </div>
            <div className="h-2.5 rounded-full bg-surface-3 overflow-hidden">
              <div
                className={cn(
                  "h-full transition-all duration-500",
                  progressPct >= 80 ? "bg-profit" : progressPct >= 50 ? "bg-brand" : "bg-warning",
                )}
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Category filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveFilter("all")}
          className={cn(
            "px-3 py-1.5 rounded-md text-xs font-semibold transition-all whitespace-nowrap border",
            activeFilter === "all"
              ? "bg-brand text-brand-foreground border-brand"
              : "bg-surface border-border text-foreground-muted hover:border-border-strong",
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
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all whitespace-nowrap border",
                activeFilter === cat
                  ? "bg-brand text-brand-foreground border-brand"
                  : "bg-surface border-border text-foreground-muted hover:border-border-strong",
              )}
            >
              {cfg.icon}
              {cfg.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Add New Habit Bar */}
      <Card>
        <CardContent className="p-4">
          <form onSubmit={handleAdd} className="flex flex-col md:flex-row gap-3">
            <Input
              placeholder="Add new habit (e.g. Read 20 mins, Cold shower...)"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="flex-1"
            />
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="08:00 AM"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                className="w-28"
              />
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as RoutineCategory)}
                className="rounded-md border border-border bg-surface px-3 py-2 text-xs outline-none"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_CONFIG[c].label}
                  </option>
                ))}
              </select>
              <Button type="submit" disabled={adding || !newTitle.trim()} size="sm">
                <Plus className="w-4 h-4" />
                Add
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Routine Items List with Explicit Done / Not Done Status */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <Card className="py-12 text-center border-dashed">
          <CardContent className="space-y-2">
            <CalendarCheck className="w-8 h-8 text-foreground-subtle mx-auto" />
            <p className="text-sm font-medium text-foreground-muted">No routine items found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2.5">
          {filteredItems.map((item) => {
            const status = todayStatusMap.get(item.id);
            const isCompleted = status === "completed";
            const isNotDone = status === "not_done";
            const cfg = CATEGORY_CONFIG[item.category];

            return (
              <Card
                key={item.id}
                className={cn(
                  "transition-all border bg-surface-2",
                  !status && "hover:border-border-strong",
                )}
              >
                <CardContent className="p-4 flex items-center justify-between gap-3">
                  {/* Left info */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Explicit DONE Button */}
                      <button
                        onClick={() => handleToggleStatus(item, "completed")}
                        className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center transition-all border",
                          isCompleted
                            ? "bg-profit text-white border-profit shadow-sm"
                            : "bg-surface-2 border-border text-foreground-subtle hover:text-profit hover:border-profit/40",
                        )}
                        title="Mark Done"
                      >
                        <Check className="w-4 h-4" />
                      </button>

                      {/* Explicit NOT DONE Button */}
                      <button
                        onClick={() => handleToggleStatus(item, "not_done")}
                        className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center transition-all border",
                          isNotDone
                            ? "bg-danger text-white border-danger shadow-sm"
                            : "bg-surface-2 border-border text-foreground-subtle hover:text-danger hover:border-danger/40",
                        )}
                        title="Mark Not Done"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="min-w-0">
                      <p
                        className={cn(
                          "text-sm font-semibold truncate",
                          isCompleted && "line-through text-foreground-muted",
                          isNotDone && "text-danger/90",
                        )}
                      >
                        {item.title}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-foreground-subtle">
                        {item.time_slot && (
                          <span className="flex items-center gap-1 font-mono">
                            <Clock className="w-3 h-3 text-foreground-subtle" />
                            {item.time_slot}
                          </span>
                        )}
                        <span>·</span>
                        <span className="flex items-center gap-1">
                          {cfg.icon}
                          {cfg.label}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Status Badge & Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {isCompleted && (
                      <Badge variant="profit" className="text-[10px]">
                        ✓ DONE
                      </Badge>
                    )}
                    {isNotDone && (
                      <Badge variant="loss" className="text-[10px]">
                        ✕ MISSED
                      </Badge>
                    )}
                    {!status && (
                      <Badge variant="outline" className="text-[10px] text-foreground-subtle">
                        PENDING
                      </Badge>
                    )}

                    <button
                      onClick={() => openEdit(item)}
                      className="p-1.5 rounded hover:bg-surface-2 text-foreground-subtle hover:text-foreground"
                      title="Edit item"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-1.5 rounded hover:bg-loss/10 text-foreground-subtle hover:text-loss"
                      title="Delete item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit Modal */}
      {editingItem && (
        <Modal
          open={!!editingItem}
          onClose={() => setEditingItem(null)}
          title="Edit Habit"
        >
          <form onSubmit={handleEditSave} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground-muted">Habit Title</label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground-muted">Time Slot</label>
                <Input
                  value={editTime}
                  onChange={(e) => setEditTime(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground-muted">Category</label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value as RoutineCategory)}
                  className="w-full rounded-md border border-border bg-surface px-3 py-2 text-xs outline-none"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {CATEGORY_CONFIG[c].label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setEditingItem(null)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={editSaving}>
                Save Changes
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
