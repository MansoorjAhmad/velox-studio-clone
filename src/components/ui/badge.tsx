import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-surface-2 text-foreground-muted border border-border",
        profit: "bg-profit/15 text-profit border border-profit/30",
        loss: "bg-loss/15 text-loss border border-loss/30",
        warning: "bg-warning/15 text-warning border border-warning/30",
        info: "bg-info/15 text-info border border-info/30",
        brand: "bg-brand/15 text-brand border border-brand/30",
        outline: "border border-border-strong text-foreground-muted",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
