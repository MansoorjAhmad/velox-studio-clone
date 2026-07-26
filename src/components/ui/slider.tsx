"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Range slider styled to match the design system.
 */
const Slider = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & {
    label?: string;
    suffix?: string;
  }
>(({ className, label, suffix, value, ...props }, ref) => {
  const v = Number(value ?? 0);
  const min = Number(props.min ?? 0);
  const max = Number(props.max ?? 100);
  const pct = ((v - min) / (max - min)) * 100;

  return (
    <div className="space-y-2">
      {label && (
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-foreground-muted">
            {label}
          </label>
          <span className="text-sm tabular font-semibold text-foreground">
            {v}
            {suffix}
          </span>
        </div>
      )}
      <input
        ref={ref}
        type="range"
        value={value}
        className={cn(
          "w-full h-1.5 rounded-full appearance-none cursor-pointer outline-none",
          "bg-surface-3",
          className,
        )}
        style={{
          background: `linear-gradient(to right, var(--brand) 0%, var(--brand) ${pct}%, var(--surface-3) ${pct}%, var(--surface-3) 100%)`,
        }}
        {...props}
      />
      <style>{`
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: var(--brand);
          cursor: pointer;
          border: 2px solid var(--background);
          box-shadow: 0 0 0 1px var(--brand);
        }
        input[type="range"]::-moz-range-thumb {
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: var(--brand);
          cursor: pointer;
          border: 2px solid var(--background);
        }
      `}</style>
    </div>
  );
});
Slider.displayName = "Slider";

export { Slider };
