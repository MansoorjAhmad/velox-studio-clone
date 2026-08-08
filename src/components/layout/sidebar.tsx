"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import {
  LayoutDashboard,
  BookOpen,
  BarChart3,
  Calculator,
  DollarSign,
  TrendingUp,
  CreditCard,
  Target,
  PieChart,
  CalendarCheck,
  Activity,
  CheckSquare,
  Compass,
  Settings,
  LogOut,
  Sparkles,
  Shield,
  X,
} from "lucide-react";
import { type LucideIcon } from "lucide-react";

type NavItem = {
  name: string;
  href: string;
  icon: LucideIcon;
};

const NAV: NavItem[] = [
  { name: "Dashboard",                href: "/dashboard",                  icon: LayoutDashboard },
  { name: "Trade Log",                href: "/dashboard/journal",          icon: BookOpen },
  { name: "Trader Index",             href: "/dashboard/trader-index",     icon: Shield },
  { name: "Performance Analytics",    href: "/dashboard/analytics",        icon: BarChart3 },
  { name: "Backtest Replay",          href: "/dashboard/backtest",         icon: Activity },
  { name: "Master Plan",              href: "/dashboard/plan",             icon: Compass },
  { name: "Risk Calculator",          href: "/dashboard/calculator",       icon: Calculator },
  { name: "Finances",                 href: "/dashboard/finances",         icon: DollarSign },
  { name: "Finance Analytics",        href: "/dashboard/finances-analytics", icon: TrendingUp },
  { name: "Debt Analytics",           href: "/dashboard/debts",            icon: CreditCard },
  { name: "Goals",                    href: "/dashboard/goals",            icon: Target },
  { name: "Goals Analytics",          href: "/dashboard/goals-analytics",  icon: PieChart },
  { name: "Daily Routine",            href: "/dashboard/routine",          icon: CalendarCheck },
  { name: "Daily Routine Analytics",  href: "/dashboard/routine-analytics",  icon: Activity },
  { name: "Tasks",                    href: "/dashboard/tasks",            icon: CheckSquare },
];

const BOTTOM_NAV: NavItem[] = [
  { name: "Velox Zenith", href: "/dashboard/zenith",   icon: Sparkles },
  { name: "Settings",     href: "/dashboard/settings", icon: Settings },
];

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ mobileOpen = false, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {mobileOpen && (
        <div
          onClick={onMobileClose}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden animate-fade-in"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 h-screen w-60 flex flex-col border-r border-border bg-surface overflow-hidden transition-transform duration-300 ease-out",
          "md:translate-x-0",
          mobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* Brand header */}
        <div className="relative h-14 flex items-center justify-between px-4 border-b border-border overflow-hidden shrink-0">
          <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-20 h-20 rounded-full bg-brand/20 blur-2xl pointer-events-none" />
          <div className="relative flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand/15 border border-brand/25 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-brand" />
            </div>
            <div>
              <span className="text-sm font-bold tracking-tight leading-none block">Velox Studio</span>
              <span className="text-[10px] text-foreground-subtle leading-none block mt-0.5">Performance OS</span>
            </div>
          </div>

          <button
            onClick={onMobileClose}
            className="md:hidden p-1 rounded hover:bg-surface-2 text-foreground-subtle hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          <p className="px-2.5 mb-2 text-[9px] font-bold uppercase tracking-[0.12em] text-foreground-subtle/60">
            Main OS
          </p>
          {NAV.map((item) => (
            <NavLinkRow
              key={item.href}
              item={item}
              active={
                item.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(item.href)
              }
              onClick={onMobileClose}
            />
          ))}
        </nav>

        {/* Bottom section */}
        <div className="border-t border-border py-3 px-2 space-y-0.5 shrink-0">
          <p className="px-2.5 mb-2 text-[9px] font-bold uppercase tracking-[0.12em] text-foreground-subtle/60">
            System
          </p>
          {BOTTOM_NAV.map((item) => (
            <NavLinkRow
              key={item.href}
              item={item}
              active={pathname.startsWith(item.href)}
              onClick={onMobileClose}
            />
          ))}
          <button
            onClick={handleLogout}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-all duration-200",
              "text-foreground-subtle hover:text-loss hover:bg-loss/8 active:scale-[0.98]",
            )}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>Log out</span>
          </button>
        </div>

        {/* Version badge */}
        <div className="px-4 pb-3 pt-0 shrink-0">
          <div className="rounded-md bg-surface-2 border border-border px-2.5 py-1.5 flex items-center justify-between">
            <span className="text-[9px] font-mono text-foreground-subtle/50">v1.2.0</span>
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-profit" />
              <span className="text-[9px] font-mono text-profit/70">executive</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

function NavLinkRow({
  item,
  active,
  onClick,
}: {
  item: NavItem;
  active: boolean;
  onClick?: () => void;
}) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        "group relative flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-all duration-200",
        active
          ? "bg-brand/10 text-brand font-medium"
          : "text-foreground-muted hover:text-foreground hover:bg-surface-2",
      )}
    >
      {active && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full bg-brand transition-all duration-200" />
      )}
      <Icon className={cn("w-4 h-4 shrink-0 transition-all duration-200", active && "scale-105")} />
      <span className="truncate">{item.name}</span>
      {!active && (
        <span className="ml-auto opacity-0 group-hover:opacity-40 transition-opacity duration-200 text-foreground-subtle text-xs">›</span>
      )}
    </Link>
  );
}
