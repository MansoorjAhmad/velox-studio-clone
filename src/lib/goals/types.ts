export interface Goal {
  id: string;
  user_id: string;
  title: string;
  category: "trading" | "health" | "work" | "personal" | "learning" | "finance";
  period: "weekly" | "monthly" | "quarterly" | "annual" | "custom";
  period_key: string;
  custom_label: string | null;   // only for period === 'custom'
  target_value: number | null;
  current_value: number | null;
  unit: string;
  notes: string | null;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export type GoalInput = Omit<
  Goal,
  "id" | "user_id" | "created_at" | "updated_at" | "completed" | "completed_at" | "current_value"
>;

export const GOAL_CATEGORIES = [
  { value: "trading", label: "Trading", emoji: "📈" },
  { value: "health", label: "Health", emoji: "💪" },
  { value: "work", label: "Work", emoji: "💼" },
  { value: "personal", label: "Personal", emoji: "🌱" },
  { value: "learning", label: "Learning", emoji: "📚" },
  { value: "finance", label: "Finance", emoji: "💰" },
] as const;

export const GOAL_UNITS = ["count", "usd", "hours", "%"] as const;

/** Get ISO week key like '2026-W29'. */
export function weekKey(date: Date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

/** Get month key like '2026-07'. */
export function monthKey(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

/** Get quarter key like '2026-Q3'. */
export function quarterKey(date: Date = new Date()): string {
  const q = Math.ceil((date.getMonth() + 1) / 3);
  return `${date.getFullYear()}-Q${q}`;
}

/** Get annual key like '2026'. */
export function annualKey(date: Date = new Date()): string {
  return `${date.getFullYear()}`;
}
