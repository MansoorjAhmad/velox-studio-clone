"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Bell, Menu, ChevronDown, ShieldCheck, Wallet, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { getTradingAccounts } from "@/lib/accounts/actions";
import type { TradingAccount } from "@/lib/accounts/types";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard":                   "Dashboard",
  "/dashboard/journal":           "Trade Log",
  "/dashboard/trader-index":      "Trader Index",
  "/dashboard/analytics":         "Performance Analytics",
  "/dashboard/backtest":          "Backtest Replay",
  "/dashboard/calculator":        "Risk Calculator",
  "/dashboard/finances":          "Finances",
  "/dashboard/finances-analytics": "Finance Analytics",
  "/dashboard/debts":             "Debt Analytics",
  "/dashboard/goals":             "Goals",
  "/dashboard/goals-analytics":   "Goals Analytics",
  "/dashboard/routine":           "Daily Routine",
  "/dashboard/routine-analytics": "Daily Routine Analytics",
  "/dashboard/tasks":             "Tasks",
  "/dashboard/plan":              "Master Plan",
  "/dashboard/zenith":            "Velox Zenith",
  "/dashboard/settings":          "Settings",
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

  const [accounts, setAccounts] = useState<TradingAccount[]>([]);
  const [selectedAccId, setSelectedAccId] = useState<string>("all");
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    const load = async () => {
      const res = await getTradingAccounts();
      const remote = res.data ?? [];
      const local = JSON.parse(localStorage.getItem("velox_local_accounts") || "[]");
      const list = [...remote, ...local];
      setAccounts(list);

      const saved = localStorage.getItem("velox_active_account_id");
      if (saved) {
        setSelectedAccId(saved);
      } else if (list.length > 0) {
        const defaultAcc = list.find((a) => a.is_default) ?? list[0];
        setSelectedAccId(defaultAcc.id);
        localStorage.setItem("velox_active_account_id", defaultAcc.id);
      }
    };
    load();

    const handleAccountsChanged = () => load();
    window.addEventListener("trading_accounts_changed", handleAccountsChanged);
    window.addEventListener("active_account_changed", handleAccountsChanged);
    return () => {
      window.removeEventListener("trading_accounts_changed", handleAccountsChanged);
      window.removeEventListener("active_account_changed", handleAccountsChanged);
    };
  }, []);

  const handleSelectAccount = (id: string) => {
    setSelectedAccId(id);
    localStorage.setItem("velox_active_account_id", id);
    setShowDropdown(false);
    // Dispatch custom event for reactive page filtering
    window.dispatchEvent(new Event("active_account_changed"));
  };

  const activeAcc = accounts.find((a) => a.id === selectedAccId);

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

      {/* Center/Right — Account Switcher + Clock + Actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Account Switcher Pill Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowDropdown((v) => !v)}
            className="flex items-center gap-2 rounded-full border border-border bg-surface-2 px-3 py-1.5 h-8 text-xs font-semibold hover:border-brand/50 transition-all"
          >
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: activeAcc ? activeAcc.color : "#6366f1" }}
            />
            <span className="truncate max-w-[110px] text-foreground">
              {selectedAccId === "all" ? "All Accounts" : activeAcc ? activeAcc.name : "Select Account"}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-foreground-subtle" />
          </button>

          {showDropdown && (
            <div className="absolute right-0 mt-2 w-56 rounded-xl border border-border bg-surface shadow-2xl p-1.5 z-50 animate-fade-in space-y-1">
              <p className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-foreground-subtle">
                Trading Account Switcher
              </p>
              <button
                onClick={() => handleSelectAccount("all")}
                className={cn(
                  "w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition-all",
                  selectedAccId === "all" ? "bg-brand/15 text-brand" : "hover:bg-surface-2 text-foreground-muted",
                )}
              >
                <div className="flex items-center gap-2">
                  <Wallet className="w-3.5 h-3.5 text-brand" />
                  <span>All Accounts (Aggregated)</span>
                </div>
              </button>

              {accounts.map((acc) => (
                <button
                  key={acc.id}
                  onClick={() => handleSelectAccount(acc.id)}
                  className={cn(
                    "w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition-all",
                    selectedAccId === acc.id ? "bg-brand/15 text-brand font-bold" : "hover:bg-surface-2 text-foreground-muted",
                  )}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: acc.color }} />
                    <span className="truncate">{acc.name}</span>
                  </div>
                  <span className="text-[10px] font-mono text-foreground-subtle">${acc.initial_balance.toLocaleString()}</span>
                </button>
              ))}

              <div className="pt-1 border-t border-border/50">
                <a
                  href="/dashboard/settings"
                  className="w-full flex items-center justify-center gap-1 py-1.5 text-[11px] font-semibold text-brand hover:underline"
                >
                  + Manage Accounts in Settings
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Live clock */}
        <div className="hidden sm:flex flex-col items-end">
          <span className="text-xs font-mono font-semibold text-foreground tabular leading-none">{timeStr}</span>
          <span className="text-[9px] text-foreground-subtle mt-0.5 leading-none">{dateStr}</span>
        </div>

        <div className="hidden sm:block w-px h-5 bg-border" />

        {/* Command palette trigger (⌘K / Ctrl+K) */}
        <button
          className={cn(
            "hidden sm:flex items-center gap-2 rounded-md border border-border bg-surface-2/60 px-2.5 h-8",
            "text-foreground-subtle hover:text-foreground-muted hover:border-border-strong",
            "transition-colors duration-150 cursor-pointer",
          )}
          title="Search… (Ctrl+K)"
          onClick={() => window.dispatchEvent(new Event("velox-open-command-palette"))}
        >
          <Search className="w-3.5 h-3.5" />
          <span className="text-[11px]">Search…</span>
          <kbd className="inline-flex items-center rounded border border-border bg-surface px-1 py-0.5 font-mono text-[9px] text-foreground-subtle leading-none">Ctrl K</kbd>
        </button>

        {/* Theme toggle */}
        <ThemeToggle />

        {/* Notification bell → Trader Index (discipline alerts) */}
        <a
          href="/dashboard/trader-index"
          className={cn(
            "relative w-8 h-8 rounded-md flex items-center justify-center",
            "text-foreground-subtle hover:text-foreground hover:bg-surface-2",
            "transition-colors duration-150",
          )}
          title="Trader Index & discipline alerts"
        >
          <Bell className="w-4 h-4" />
        </a>

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
