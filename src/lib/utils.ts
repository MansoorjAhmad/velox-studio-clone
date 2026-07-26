import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind classes intelligently (later classes win conflicts). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a number as USD currency. */
export function formatCurrency(
  value: number,
  opts: { sign?: boolean; compact?: boolean } = {},
): string {
  const { sign = false, compact = false } = opts;
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: compact ? "compact" : "standard",
    maximumFractionDigits: compact ? 1 : 2,
  }).format(Math.abs(value));

  if (!sign) return value < 0 ? `-${formatted}` : formatted;
  return value < 0 ? `-${formatted}` : `+${formatted}`;
}

/** Format a number as a percentage (0.64 → "64.0%"). */
export function formatPercent(value: number, decimals = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/** Format a raw number with thousands separators. */
export function formatNumber(value: number, decimals = 0): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/** Relative time like "2h ago", "just now". */
export function timeAgo(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString();
}

/** Map a P&L sign to the profit/loss color token. */
export function pnlColor(value: number): string {
  if (value > 0) return "text-profit";
  if (value < 0) return "text-loss";
  return "text-foreground-muted";
}

/** YYYY-MM-DD for a date (used as Supabase date keys). */
export function dateKey(date: Date = new Date()): string {
  return date.toISOString().split("T")[0];
}

/** Monday of the week containing `date`. */
export function weekStart(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().split("T")[0];
}
