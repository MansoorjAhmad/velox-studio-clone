export interface Task {
  id: string;
  user_id: string;
  title: string;
  category: string;
  priority: string;
  status: string;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskInput {
  title: string;
  category: string;
  priority: string;
  due_date?: string | null;
}

export const TASK_CATEGORIES = [
  "trading",
  "health",
  "work",
  "personal",
  "learning",
  "finance",
] as const;

export const TASK_PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export const TASK_STATUSES = ["todo", "in_progress", "done"] as const;

export const PRIORITY_COLORS: Record<string, string> = {
  low: "text-foreground-muted",
  medium: "text-brand",
  high: "text-amber-400",
  urgent: "text-loss",
};

export const PRIORITY_BG: Record<string, string> = {
  low: "bg-foreground-muted/10",
  medium: "bg-brand/10",
  high: "bg-amber-400/10",
  urgent: "bg-loss/10",
};

export const STATUS_LABELS: Record<string, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  done: "Done",
};
