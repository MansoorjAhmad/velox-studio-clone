"use client";

export const dynamic = "force-dynamic";

import { PositionCalculator } from "@/components/calculator/position-calculator";
import { Calculator } from "lucide-react";

export default function CalculatorPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-md bg-brand/10 flex items-center justify-center">
          <Calculator className="w-5 h-5 text-brand" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Risk & Position Size Calculator</h1>
          <p className="text-sm text-foreground-muted">
            Calculate precise lot sizing for Forex, Gold, and Cent accounts.
          </p>
        </div>
      </div>

      {/* Main Position Calculator Component */}
      <PositionCalculator />
    </div>
  );
}
