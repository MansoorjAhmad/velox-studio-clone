"use client";

/**
 * EmptyState — premium no-data state for all pages.
 *
 * Replaces plain "no data" text with a visually rich state:
 * - Large icon with brand glow
 * - Bold headline
 * - Muted description text
 * - Optional CTA button
 * - Subtle animated background
 */

import Link from "next/link";
import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    href: string;
  };
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  size = "md",
}: EmptyStateProps) {
  const sizeConfig = {
    sm: { wrapper: "py-10", icon: "w-10 h-10", iconInner: "w-5 h-5", title: "text-sm", desc: "text-xs" },
    md: { wrapper: "py-16", icon: "w-16 h-16", iconInner: "w-8 h-8", title: "text-base", desc: "text-sm" },
    lg: { wrapper: "py-24", icon: "w-20 h-20", iconInner: "w-10 h-10", title: "text-lg", desc: "text-sm" },
  }[size];

  return (
    <div className={cn("flex flex-col items-center justify-center text-center relative overflow-hidden", sizeConfig.wrapper, className)}>
      {/* Ambient glow background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full bg-brand/5 blur-3xl" />
      </div>

      {/* Icon */}
      <div className={cn(
        "relative rounded-2xl bg-brand/8 border border-brand/15 flex items-center justify-center mb-5",
        "shadow-[0_0_32px_-8px_var(--brand-soft)]",
        sizeConfig.icon,
      )}>
        <Icon className={cn("text-brand/70", sizeConfig.iconInner)} />
      </div>

      {/* Text */}
      <h3 className={cn("font-bold text-foreground mb-2", sizeConfig.title)}>
        {title}
      </h3>
      <p className={cn("text-foreground-muted max-w-xs leading-relaxed", sizeConfig.desc)}>
        {description}
      </p>

      {/* CTA */}
      {action && (
        <Link
          href={action.href}
          className={cn(
            "mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold",
            "bg-brand text-white shadow-sm shadow-brand/30",
            "hover:bg-brand/90 transition-all duration-200 active:scale-[0.97]",
          )}
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}
