"use client";

import { useEffect, useState, useCallback } from "react";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { getTasks, createTask, updateTask, updateTaskStatus, deleteTask } from "@/lib/tasks/actions";
import {
  TASK_CATEGORIES,
  TASK_PRIORITIES,
  PRIORITY_COLORS,
  STATUS_LABELS,
  type Task,
  type TaskInput,
} from "@/lib/tasks/types";
import {
  CheckSquare,
  Plus,
  Trash2,
  Edit2,
  Loader2,
  Inbox,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<string>("todo");
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await getTasks();
    if (res.error) setError(res.error);
    setTasks(res.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = tasks.filter((t) => {
    if (tab === "all") return true;
    return t.status === tab;
  });

  const todoCount = tasks.filter((t) => t.status === "todo").length;
  const ipCount = tasks.filter((t) => t.status === "in_progress").length;
  const doneCount = tasks.filter((t) => t.status === "done").length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-brand/10 flex items-center justify-center">
            <CheckSquare className="w-5 h-5 text-brand" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Tasks</h1>
            <p className="text-sm text-foreground-muted">
              Stay on top of everything.
            </p>
          </div>
        </div>
        <Button size="sm" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4" />
          Add Task
        </Button>
      </div>

      {error && (
        <Card className="border-danger/30 bg-danger/5">
          <CardContent className="py-3 text-sm text-danger">{error}</CardContent>
        </Card>
      )}

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "To Do", count: todoCount, color: "text-foreground-muted" },
          { label: "In Progress", count: ipCount, color: "text-brand" },
          { label: "Done", count: doneCount, color: "text-profit" },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-lg border border-border bg-surface px-4 py-3"
          >
            <p className={cn("text-2xl font-bold tabular", s.color)}>
              {s.count}
            </p>
            <p className="text-xs text-foreground-subtle">{s.label}</p>
          </div>
        ))}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="todo">
            To Do <span className="ml-1 tabular text-xs opacity-50">{todoCount}</span>
          </TabsTrigger>
          <TabsTrigger value="in_progress">
            Active <span className="ml-1 tabular text-xs opacity-50">{ipCount}</span>
          </TabsTrigger>
          <TabsTrigger value="done">
            Done <span className="ml-1 tabular text-xs opacity-50">{doneCount}</span>
          </TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        <TabsContent value={tab}>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-2">
              {filtered.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onChanged={load}
                  onEdit={() => setEditingTask(task)}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Modal */}
      <TaskFormModal
        open={showForm}
        onClose={() => setShowForm(false)}
        onSaved={() => {
          setShowForm(false);
          load();
        }}
      />

      {/* Edit Modal */}
      {editingTask && (
        <TaskFormModal
          open={!!editingTask}
          taskToEdit={editingTask}
          onClose={() => setEditingTask(null)}
          onSaved={() => {
            setEditingTask(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function TaskRow({
  task,
  onChanged,
  onEdit,
}: {
  task: Task;
  onChanged: () => void;
  onEdit: () => void;
}) {
  const nextStatus =
    task.status === "todo"
      ? "in_progress"
      : task.status === "in_progress"
        ? "done"
        : "todo";

  const todayStr = new Date().toISOString().split("T")[0];

  const isOverdue =
    task.due_date &&
    task.status !== "done" &&
    task.due_date < todayStr;

  const isDueToday =
    task.due_date &&
    task.status !== "done" &&
    task.due_date === todayStr;

  // Priority dot colors
  const dotColor: Record<string, string> = {
    low: "bg-foreground-muted/50",
    medium: "bg-brand",
    high: "bg-amber-400",
    urgent: "bg-loss",
  };

  return (
    <div
      className={cn(
        "group flex items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3 transition-colors hover:bg-surface-2/50",
        task.status === "done" && "opacity-50",
      )}
    >
      {/* Status cycle button */}
      <button
        onClick={async () => {
          await updateTaskStatus(task.id, nextStatus);
          onChanged();
        }}
        className={cn(
          "w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors",
          task.status === "done"
            ? "border-profit bg-profit text-surface"
            : task.status === "in_progress"
              ? "border-brand bg-brand/20"
              : "border-foreground-subtle/40 hover:border-brand",
        )}
        title={`Move to: ${STATUS_LABELS[nextStatus]}`}
      >
        {task.status === "done" && (
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      {/* Priority dot */}
      <span
        className={cn(
          "w-2 h-2 rounded-full shrink-0",
          dotColor[task.priority] ?? "bg-foreground-muted/50",
        )}
        title={`Priority: ${task.priority}`}
      />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p
            className={cn(
              "text-sm font-medium truncate",
              task.status === "done" && "line-through text-foreground-muted",
            )}
          >
            {task.title}
          </p>
          {isDueToday && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-sm bg-amber-400/15 text-amber-400 leading-none shrink-0">
              Due Today
            </span>
          )}
          {isOverdue && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-sm bg-loss/15 text-loss leading-none shrink-0">
              Overdue
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs capitalize text-foreground-subtle">
            {task.category}
          </span>
          <span className="text-foreground-subtle/30">·</span>
          <span className={cn("text-xs capitalize", PRIORITY_COLORS[task.priority])}>
            {task.priority}
          </span>
          {task.due_date && !isDueToday && !isOverdue && (
            <>
              <span className="text-foreground-subtle/30">·</span>
              <span className="text-xs text-foreground-subtle">
                {new Date(task.due_date).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {task.status !== "done" && (
          <button
            onClick={async () => {
              await updateTaskStatus(task.id, "done");
              onChanged();
            }}
            className="p-1.5 rounded hover:bg-profit/10 text-foreground-subtle hover:text-profit"
            title="Complete"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={onEdit}
          className="p-1.5 rounded hover:bg-brand/10 text-foreground-subtle hover:text-brand"
          title="Edit Task"
        >
          <Edit2 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={async () => {
            await deleteTask(task.id);
            onChanged();
          }}
          className="p-1.5 rounded hover:bg-loss/10 text-foreground-subtle hover:text-loss"
          title="Delete Task"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

function TaskFormModal({
  open,
  taskToEdit,
  onClose,
  onSaved,
}: {
  open: boolean;
  taskToEdit?: Task;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(taskToEdit?.title ?? "");
  const [category, setCategory] = useState<string>(taskToEdit?.category ?? "personal");
  const [priority, setPriority] = useState<string>(taskToEdit?.priority ?? "medium");
  const [dueDate, setDueDate] = useState(taskToEdit?.due_date ?? "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (taskToEdit) {
      setTitle(taskToEdit.title);
      setCategory(taskToEdit.category);
      setPriority(taskToEdit.priority);
      setDueDate(taskToEdit.due_date ?? "");
    }
  }, [taskToEdit]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    if (!title.trim()) {
      setErr("Title is required.");
      setSaving(false);
      return;
    }

    let res;
    if (taskToEdit) {
      res = await updateTask(taskToEdit.id, {
        title: title.trim(),
        category,
        priority,
        due_date: dueDate || null,
      });
    } else {
      res = await createTask({
        title: title.trim(),
        category,
        priority,
        due_date: dueDate || null,
      } as TaskInput);
    }

    setSaving(false);
    if (res.error) {
      setErr(res.error);
      return;
    }
    setTitle("");
    setDueDate("");
    onSaved();
  };

  return (
    <Modal open={open} onClose={onClose} title={taskToEdit ? "Edit Task" : "Add Task"}>
      <form onSubmit={handleSave} className="space-y-4">
        <div className="space-y-1.5">
          <Label>Task Title *</Label>
          <Input
            placeholder="e.g. Review EURUSD daily chart"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {TASK_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Priority</Label>
            <Select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              {TASK_PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Due Date (optional)</Label>
          <Input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>
        {err && <p className="text-sm text-danger">{err}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : taskToEdit ? "Update Task" : "Add Task"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function EmptyState() {
  return (
    <div className="rounded-lg border border-dashed border-border bg-surface/50 py-12 text-center">
      <Inbox className="w-8 h-8 text-foreground-subtle mx-auto mb-3" />
      <p className="text-sm font-medium">No tasks here</p>
      <p className="text-xs text-foreground-muted mt-1">
        Add a task to start organizing your day.
      </p>
    </div>
  );
}
