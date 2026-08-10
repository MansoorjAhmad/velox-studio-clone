"use client";

/**
 * MobileBottomNav — fixed bottom navigation bar shown only on mobile.
 * Shows the 5 most important pages with icons + labels.
 * The active item gets a brand color highlight.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  BookOpen,
  BarChart3,
  Shield,
  Sparkles,
} from "lucide-react";

const MOBILE_NAV = [
  { name: "Home",      href: "/dashboard",              icon: LayoutDashboard },
  { name: "Trade Log", href: "/dashboard/journal",      icon: BookOpen },
  { name: "Analytics", href: "/dashboard/analytics",    icon: BarChart3 },
  { name: "Index",     href: "/dashboard/trader-index", icon: Shield },
  { name: "Zenith",    href: "/dashboard/zenith",       icon: Sparkles },
];

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl">
      <div className="grid grid-cols-5 h-16">
        {MOBILE_NAV.map((item) => {
          const active =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 transition-all duration-200 relative",
                active
                  ? "text-brand"
                  : "text-foreground-subtle hover:text-foreground",
              )}
            >
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-brand" />
              )}
              <Icon className={cn("w-5 h-5 transition-transform duration-200", active && "scale-110")} />
              <span className="text-[9px] font-semibold tracking-wide">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
