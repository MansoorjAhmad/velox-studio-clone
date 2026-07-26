"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Bell, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard":            "Dashboard",
  "/dashboard/journal":    "Trading Journal",
  "/dashboard/calculator": "Risk Calculator",
  "/dashboard/finances":   "Finances",
  "/dashboard/goals":      "Goals",
  "/dashboard/routine":    "Daily Routine",
  "/dashboard/tasks":      "Tasks",
  "/dashboard/time":       "Time Tracking",
  "/dashboard/zenith":     "Velox Zenith",
  "/dashboard/settings":   "Settings",
};

function useTime() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function getGreeting(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 21) return "Good evening";
  return "Good night";
}

interface TopBarProps {
  username: string;
  onMenuClick?: () => void;
}

export function TopBar({ username, onMenuClick }: TopBarProps) {
  const pathname = usePathname();
  const now = useTime();

  const pageTitle = PAGE_TITLES[pathname] ?? "Dashboard";
  const greeting = getGreeting(now.getHours());

  const timeStr = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  const dateStr = now.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  return (
    <header className="sticky top-0 z-30 h-14 flex items-center justify-between px-4 sm:px-6 border-b border-border bg-surface/80 backdrop-blur-xl shrink-0">
      {/* Left — Hamburger + page title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="md:hidden p-1.5 rounded-md hover:bg-surface-2 text-foreground-subtle hover:text-foreground"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-sm font-semibold text-foreground leading-none">{pageTitle}</h2>
          <p className="text-[10px] text-foreground-subtle mt-0.5 leading-none">
            {greeting}{username ? `, ${username}` : ""}
          </p>
        </div>
      </div>

      {/* Right — clock + actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Live clock */}
        <div className="hidden sm:flex flex-col items-end">
          <span className="text-xs font-mono font-semibold text-foreground tabular leading-none">{timeStr}</span>
          <span className="text-[9px] text-foreground-subtle mt-0.5 leading-none">{dateStr}</span>
        </div>

        <div className="hidden sm:block w-px h-5 bg-border" />

        {/* Theme toggle */}
        <ThemeToggle />

        {/* Notification bell */}
        <button
          className={cn(
            "relative w-8 h-8 rounded-md flex items-center justify-center",
            "text-foreground-subtle hover:text-foreground hover:bg-surface-2",
            "transition-colors duration-150",
          )}
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
        </button>

        {/* User avatar pill */}
        {username && (
          <div className="flex items-center gap-2 rounded-full border border-border bg-surface-2 px-2.5 py-1.5 h-8">
            <div className="w-4 h-4 rounded-full bg-brand/20 border border-brand/30 flex items-center justify-center shrink-0">
              <span className="text-[8px] font-bold text-brand uppercase">
                {username.charAt(0)}
              </span>
            </div>
            <span className="text-xs font-medium text-foreground-muted hidden md:block truncate max-w-[80px]">
              {username}
            </span>
          </div>
        )}
      </div>
    </header>
  );
}
