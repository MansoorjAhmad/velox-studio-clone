"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  getGoals,
  createGoal,
  updateProgress,
  toggleComplete,
  deleteGoal,
} from "@/lib/goals/actions";
import {
  GOAL_CATEGORIES,
  GOAL_UNITS,
  weekKey,
  monthKey,
  quarterKey,
  annualKey,
  type Goal,
} from "@/lib/goals/types";
import {
  Target,
  Plus,
  Trash2,
  Check,
  Loader2,
  Inbox,
  Minus,
  LayoutGrid,
  CalendarDays,
  CheckCircle2,
  Clock,
  Pencil,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import * as Types from "@/lib/goals/types";

type TabValue = "all" | "weekly" | "monthly" | "quarterly" | "annual" | "custom";

export function GoalsPage() {
  const [goals, setGoals] = useState<Types.Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabValue>("all");
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await getGoals();
    if (res.error) setError(res.error);
    setGoals(res.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const wk = weekKey();
  const mk = monthKey();
  const qk = quarterKey();
  const ak = annualKey();

  const filtered = useMemo(() => {
    switch (tab) {
      case "all":      return goals;
      case "weekly":   return goals.filter((g) => g.period === "weekly" && g.period_key === wk);
      case "monthly":  return goals.filter((g) => g.period === "monthly" && g.period_key === mk);
      case "quarterly":return goals.filter((g) => g.period === "quarterly" && g.period_key === qk);
      case "annual":   return goals.filter((g) => g.period === "annual" && g.period_key === ak);
      case "custom":   return goals.filter((g) => g.period === "custom");
      default:         return goals;
    }
  }, [goals, tab, wk, mk, qk, ak]);

  const totalCompleted = goals.filter((g) => g.completed).length;
  const totalPending   = goals.filter((g) => !g.completed).length;

  const currentPeriod: Types.Goal["period"] | undefined =
    tab === "all" ? undefined : tab;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-brand/10 flex items-center justify-center">
            <Target className="w-5 h-5 text-brand" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Goals</h1>
            <p className="text-sm text-foreground-muted">
              Set targets. Hold yourself accountable.
            </p>
          </div>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4" />
          Add Goal
        </Button>
      </div>

      {/* Global stat pills */}
      {!loading && goals.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 rounded-full bg-profit/10 border border-profit/20 px-3 py-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-profit" />
            <span className="text-xs font-semibold text-profit">{totalCompleted} Completed</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-warning/10 border border-warning/20 px-3 py-1.5">
            <Clock className="w-3.5 h-3.5 text-warning" />
            <span className="text-xs font-semibold text-warning">{totalPending} Pending</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-brand/10 border border-brand/20 px-3 py-1.5">
            <Target className="w-3.5 h-3.5 text-brand" />
            <span className="text-xs font-semibold text-brand">{goals.length} Total</span>
          </div>
        </div>
      )}

      {error && (
        <Card className="border-danger/30 bg-danger/5">
          <CardContent className="py-3 text-sm text-danger">{error}</CardContent>
        </Card>
      )}

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabValue)}>
        <TabsList>
          <TabsTrigger value="all">
            <LayoutGrid className="w-3.5 h-3.5" />
            All
            {goals.length > 0 && (
              <span className="ml-1 text-xs text-foreground-subtle">({goals.length})</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="weekly">This Week</TabsTrigger>
          <TabsTrigger value="monthly">This Month</TabsTrigger>
          <TabsTrigger value="quarterly">This Quarter</TabsTrigger>
          <TabsTrigger value="annual">This Year</TabsTrigger>
          <TabsTrigger value="custom">
            <Pencil className="w-3.5 h-3.5" />
            Custom
          </TabsTrigger>
        </TabsList>

        {(["all", "weekly", "monthly", "quarterly", "annual", "custom"] as TabValue[]).map((t) => (
          <TabsContent key={t} value={t}>
            <GoalList
              goals={filtered}
              loading={loading}
              period={currentPeriod ?? "weekly"}
              isAllTab={t === "all"}
              isCustomTab={t === "custom"}
              onAddClick={() => setShowForm(true)}
              onChanged={load}
            />
          </TabsContent>
        ))}
      </Tabs>

      {/* Global Add Goal Modal */}
      <GoalForm
        open={showForm}
        defaultPeriod={tab === "all" ? "weekly" : tab === "custom" ? "custom" : tab}
        onClose={() => setShowForm(false)}
        onSaved={() => {
          setShowForm(false);
          load();
        }}
      />
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
//  GoalList — with Pending / Completed split
// ────────────────────────────────────────────────────────────────

function GoalList({
  goals,
  loading,
  period,
  isAllTab,
  isCustomTab,
  onAddClick,
  onChanged,
}: {
  goals: Types.Goal[];
  loading: boolean;
  period: Types.Goal["period"];
  isAllTab: boolean;
  isCustomTab: boolean;
  onAddClick: () => void;
  onChanged: () => void;
}) {
  if (loading) {
    return (
      <div className="space-y-2 mt-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  const pending   = goals.filter((g) => !g.completed);
  const completed = goals.filter((g) => g.completed);

  if (goals.length === 0) {
    return (
      <div className="space-y-4 mt-4">
        <EmptyState onAdd={onAddClick} isCustom={isCustomTab} />
      </div>
    );
  }

  return (
    <div className="space-y-6 mt-4">
      {/* Pending Section */}
      {pending.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-warning" />
            <h2 className="text-sm font-semibold text-foreground-muted uppercase tracking-wider">
              Pending
            </h2>
            <span className="text-xs text-foreground-subtle">({pending.length})</span>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {pending.map((g) => (
              <GoalCard
                key={g.id}
                goal={g}
                showPeriodBadge={isAllTab}
                onChanged={onChanged}
              />
            ))}
          </div>
        </div>
      )}

      {/* Divider */}
      {pending.length > 0 && completed.length > 0 && (
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border border-dashed" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-background px-3 text-xs text-foreground-subtle flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-profit" />
              Completed
            </span>
          </div>
        </div>
      )}

      {/* Completed Section */}
      {completed.length > 0 && (
        <div className="space-y-3">
          {pending.length === 0 && (
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-profit" />
              <h2 className="text-sm font-semibold text-foreground-muted uppercase tracking-wider">
                Completed
              </h2>
              <span className="text-xs text-foreground-subtle">({completed.length})</span>
            </div>
          )}
          <div className="grid gap-3 md:grid-cols-2">
            {completed.map((g) => (
              <GoalCard
                key={g.id}
                goal={g}
                showPeriodBadge={isAllTab}
                onChanged={onChanged}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
//  GoalCard
// ────────────────────────────────────────────────────────────────

const PERIOD_LABELS: Record<string, string> = {
  weekly: "Weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  annual: "Annual",
  custom: "Custom",
};

function GoalCard({
  goal,
  showPeriodBadge,
  onChanged,
}: {
  goal: Types.Goal;
  showPeriodBadge: boolean;
  onChanged: () => void;
}) {
  const cat = GOAL_CATEGORIES.find((c) => c.value === goal.category);
  const target  = goal.target_value ?? 0;
  const current = goal.current_value ?? 0;
  const pct = target > 0 ? Math.min(100, (current / target) * 100) : goal.completed ? 100 : 0;

  const formatVal = (v: number) => {
    if (goal.unit === "usd")   return formatCurrency(v);
    if (goal.unit === "%")     return `${v}%`;
    if (goal.unit === "hours") return `${v}h`;
    return `${v}`;
  };

  return (
    <Card
      className={cn(
        "transition-all",
        goal.completed
          ? "border-profit/20 bg-profit/[0.03] opacity-75"
          : "hover:border-border-strong",
      )}
    >
      <CardContent className="p-5 space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-lg shrink-0">{cat?.emoji}</span>
            <div className="min-w-0">
              <p
                className={cn(
                  "font-medium truncate",
                  goal.completed && "line-through text-foreground-muted",
                )}
              >
                {goal.title}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                <span className="text-xs text-foreground-subtle capitalize">
                  {goal.category}
                </span>
                {showPeriodBadge && (
                  <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                    {goal.custom_label
                      ? goal.custom_label
                      : PERIOD_LABELS[goal.period] ?? goal.period}
                  </Badge>
                )}
                {goal.custom_label && !showPeriodBadge && (
                  <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                    <CalendarDays className="w-2.5 h-2.5 mr-0.5" />
                    {goal.custom_label}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={async () => {
                await toggleComplete(goal.id);
                onChanged();
              }}
              className={cn(
                "p-1.5 rounded transition-colors",
                goal.completed
                  ? "bg-profit/15 text-profit"
                  : "text-foreground-subtle hover:text-profit hover:bg-profit/10",
              )}
              title={goal.completed ? "Mark incomplete" : "Mark complete"}
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              onClick={async () => {
                await deleteGoal(goal.id);
                onChanged();
              }}
              className="p-1.5 rounded hover:bg-loss/10 text-foreground-subtle hover:text-loss"
              title="Delete"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {target > 0 && (
          <>
            <div className="flex items-end justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold tabular">
                  {formatVal(current)}
                </span>
                <span className="text-sm text-foreground-subtle">
                  / {formatVal(target)}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={async () => {
                    await updateProgress(goal.id, Math.max(0, current - 1));
                    onChanged();
                  }}
                  className="w-6 h-6 rounded bg-surface-2 hover:bg-surface-3 flex items-center justify-center"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <button
                  onClick={async () => {
                    await updateProgress(goal.id, current + 1);
                    onChanged();
                  }}
                  className="w-6 h-6 rounded bg-brand/15 hover:bg-brand/25 text-brand flex items-center justify-center"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>

            <div className="h-2 rounded-full bg-surface-3 overflow-hidden">
              <div
                className={cn(
                  "h-full transition-all duration-500",
                  goal.completed ? "bg-profit" : pct >= 75 ? "bg-profit" : pct >= 40 ? "bg-brand" : "bg-warning",
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="text-[10px] text-foreground-subtle text-right">
              {pct.toFixed(0)}% complete
            </p>
          </>
        )}

        {goal.notes && (
          <p className="text-xs text-foreground-muted pt-1 border-t border-border/50">
            {goal.notes}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ────────────────────────────────────────────────────────────────
//  GoalForm — supports all periods including custom
// ────────────────────────────────────────────────────────────────

function GoalForm({
  open,
  defaultPeriod,
  onClose,
  onSaved,
}: {
  open: boolean;
  defaultPeriod: Types.Goal["period"];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title,       setTitle]       = useState("");
  const [category,    setCategory]    = useState<string>("trading");
  const [period,      setPeriod]      = useState<Types.Goal["period"]>(defaultPeriod);
  const [customLabel, setCustomLabel] = useState("");
  const [target,      setTarget]      = useState("");
  const [unit,        setUnit]        = useState<string>("count");
  const [notes,       setNotes]       = useState("");
  const [saving,      setSaving]      = useState(false);
  const [err,         setErr]         = useState<string | null>(null);

  // Sync period when parent tab changes
  useEffect(() => {
    setPeriod(defaultPeriod);
  }, [defaultPeriod, open]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErr(null);

    if (!title.trim()) {
      setErr("Title is required.");
      setSaving(false);
      return;
    }
    if (period === "custom" && !customLabel.trim()) {
      setErr("Please enter a custom period label.");
      setSaving(false);
      return;
    }

    const periodKey =
      period === "weekly"    ? weekKey()    :
      period === "monthly"   ? monthKey()   :
      period === "quarterly" ? quarterKey() :
      period === "annual"    ? annualKey()  :
      `custom-${customLabel.trim().toLowerCase().replace(/\s+/g, "-")}`;

    const res = await createGoal({
      title:        title.trim(),
      category:     category as Types.GoalInput["category"],
      period,
      period_key:   periodKey,
      custom_label: period === "custom" ? customLabel.trim() : null,
      target_value: target ? parseFloat(target) : null,
      unit,
      notes:        notes || null,
    });

    setSaving(false);
    if (res.error) { setErr(res.error); return; }

    setTitle(""); setTarget(""); setNotes(""); setCustomLabel("");
    onSaved();
  };

  return (
    <Modal open={open} onClose={onClose} title="Add New Goal" className="max-w-lg">
      <form onSubmit={handleSave} className="space-y-4">

        {/* Period selector — always shown so user can pick from any tab */}
        <div className="space-y-1.5">
          <Label>Period</Label>
          <Select value={period} onChange={(e) => setPeriod(e.target.value as Types.Goal["period"])}>
            <option value="weekly">📅 This Week</option>
            <option value="monthly">🗓️ This Month</option>
            <option value="quarterly">📆 This Quarter</option>
            <option value="annual">🎯 This Year</option>
            <option value="custom">✏️ Custom Period</option>
          </Select>
        </div>

        {/* Custom label input — only when custom is selected */}
        {period === "custom" && (
          <div className="space-y-1.5">
            <Label>Custom Period Label *</Label>
            <Input
              placeholder="e.g. 2026 Grind, Q1 Launch, Summer Challenge"
              value={customLabel}
              onChange={(e) => setCustomLabel(e.target.value)}
              autoFocus
            />
            <p className="text-xs text-foreground-subtle">
              This label groups your custom goals together.
            </p>
          </div>
        )}

        <div className="space-y-1.5">
          <Label>Goal Title *</Label>
          <Input
            placeholder="e.g. Hit $2,000 P&L this month"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus={period !== "custom"}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select value={category} onChange={(e) => setCategory(e.target.value)}>
              {GOAL_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.emoji} {c.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Unit</Label>
            <Select value={unit} onChange={(e) => setUnit(e.target.value)}>
              {GOAL_UNITS.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Target ({unit})</Label>
          <Input
            type="number"
            step="0.01"
            placeholder="Leave empty for a yes/no goal"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Notes (optional)</Label>
          <Input
            placeholder="Any context for this goal"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {err && <p className="text-sm text-danger">{err}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add Goal"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ────────────────────────────────────────────────────────────────
//  Empty state
// ────────────────────────────────────────────────────────────────

function EmptyState({ onAdd, isCustom }: { onAdd: () => void; isCustom: boolean }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-surface/50 py-14 text-center space-y-3">
      <Inbox className="w-8 h-8 text-foreground-subtle mx-auto" />
      <div>
        <p className="text-sm font-medium">No goals yet</p>
        <p className="text-xs text-foreground-muted mt-1">
          {isCustom
            ? "Add a custom period goal — name it anything like \"2026 Grind\" or \"Summer Launch\"."
            : "Set your first target to start tracking progress."}
        </p>
      </div>
      <Button size="sm" onClick={onAdd}>
        <Plus className="w-4 h-4" />
        Add Goal
      </Button>
    </div>
  );
}
