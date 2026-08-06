"use client";

/**
 * LivePriceWidget — shows real-time (15-min delayed) prices for key symbols.
 * Fetches from our own /api/market/quotes route (keeps API key server-side).
 * Auto-refreshes every 5 minutes.
 */

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Activity, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface Quote {
  symbol: string;
  price: number;
  change: number;
  changePct: number;
}

const SYMBOLS = ["EUR/USD", "GBP/USD", "XAU/USD", "US500", "NAS100"];

function formatPrice(price: number, symbol: string): string {
  if (symbol.includes("XAU") || symbol.includes("US5") || symbol.includes("NAS")) {
    return price.toFixed(2);
  }
  return price.toFixed(5);
}

export function LivePriceWidget() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchQuotes = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const res = await fetch(`/api/market/quotes?symbols=${SYMBOLS.join(",")}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.quotes?.length) {
        setQuotes(data.quotes);
        setLastUpdated(new Date());
      }
    } catch {
      // silently fail — no API key yet
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchQuotes();
    // Auto-refresh every 5 minutes
    const interval = setInterval(() => fetchQuotes(), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchQuotes]);

  // No API key yet — show placeholder state
  if (!loading && quotes.length === 0) {
    return (
      <Card className="card-hover">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="w-4 h-4 text-brand" />
            Live Market Prices
            <Badge variant="outline" className="text-[9px] ml-auto">Needs API Key</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {SYMBOLS.map((s) => (
              <div key={s} className="p-2.5 rounded-lg border border-border/40 bg-surface-2/20 text-center">
                <p className="text-[9px] font-mono font-bold text-foreground-subtle">{s}</p>
                <p className="text-sm font-bold font-mono text-foreground-subtle/40 mt-1">—</p>
                <p className="text-[8px] text-foreground-subtle/30 mt-0.5">Add TWELVE_DATA_API_KEY</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-hover">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Activity className="w-4 h-4 text-brand" />
          Live Market Prices
          <Badge variant="brand" className="text-[9px]">15-min delayed</Badge>
          <button
            onClick={() => fetchQuotes(true)}
            className="ml-auto p-1 rounded hover:bg-surface-2 transition-colors"
            title="Refresh prices"
          >
            <RefreshCw className={cn("w-3 h-3 text-foreground-subtle", refreshing && "animate-spin")} />
          </button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {SYMBOLS.map((s) => (
              <div key={s} className="h-16 rounded-lg bg-surface-2/40 animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              {quotes.map((q) => {
                const isUp = q.changePct >= 0;
                return (
                  <div
                    key={q.symbol}
                    className={cn(
                      "p-2.5 rounded-lg border text-center transition-all",
                      isUp
                        ? "border-profit/20 bg-profit/5"
                        : "border-loss/20 bg-loss/5",
                    )}
                  >
                    <p className="text-[9px] font-mono font-bold text-foreground-subtle">{q.symbol}</p>
                    <p className="text-sm font-extrabold font-mono tabular text-foreground mt-1">
                      {formatPrice(q.price, q.symbol)}
                    </p>
                    <div className={cn(
                      "flex items-center justify-center gap-0.5 mt-0.5",
                      isUp ? "text-profit" : "text-loss",
                    )}>
                      {isUp
                        ? <TrendingUp className="w-2.5 h-2.5" />
                        : <TrendingDown className="w-2.5 h-2.5" />
                      }
                      <span className="text-[9px] font-mono font-bold">
                        {isUp ? "+" : ""}{q.changePct.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            {lastUpdated && (
              <p className="text-[8px] text-foreground-subtle/40 text-right mt-2 font-mono">
                Updated {lastUpdated.toLocaleTimeString()}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
