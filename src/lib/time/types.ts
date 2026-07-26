export interface TimeEntry {
  id: string;
  user_id: string;
  category: string;
  description: string | null;
  start_time: string;
  end_time: string | null;
  duration_minutes: number | null;
  created_at: string;
}

export type TimeEntryInput = Pick<
  TimeEntry,
  "category" | "description" | "start_time" | "end_time"
>;

export const TIME_CATEGORIES = [
  "Trading",
  "Study",
  "Backtesting",
  "Work",
  "Health",
  "Learning",
  "Personal",
] as const;
