import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0 transition-all duration-200 active:scale-[0.97] active:brightness-95",
  {
    variants: {
      variant: {
        primary:
          "bg-brand text-white shadow-sm hover:bg-brand-hover hover:shadow-[0_4px_20px_-4px_var(--brand)]",
        secondary:
          "bg-surface-2 text-foreground border border-border hover:bg-surface-3 hover:border-border-strong",
        outline:
          "border border-border-strong bg-transparent text-foreground hover:bg-surface-2",
        ghost:
          "text-foreground-muted hover:text-foreground hover:bg-surface-2",
        danger:
          "bg-danger text-white shadow-sm hover:bg-danger/90",
        profit:
          "bg-profit/15 text-profit border border-profit/30 hover:bg-profit/25",
        loss:
          "bg-loss/15 text-loss border border-loss/30 hover:bg-loss/25",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        default: "h-9 px-4",
        lg: "h-11 px-6 text-base",
        icon: "h-9 w-9",
        "icon-sm": "h-8 w-8",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
