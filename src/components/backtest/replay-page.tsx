"use client";

/**
 * Velox Studio — Backtesting Replay Engine.
 *
 * Step through synthetic historical price data and log simulated trades.
 * Features: instrument/seed selector, play/step/speed controls, price chart
 * with entry/SL/TP markers, trade entry, open positions, and live results
 * analytics reusing the shared metrics engine.
 *
 * All simulated trades persist to localStorage — the real journal is untouched.
 */

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { PageTransition, FadeIn } from "@/components/ui/motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Play,
  Pause,
  SkipForward,
  RotateCcw,
  TrendingUp,
  TrendingDown,
  Activity,
  Target,
  Zap,
  Trash2,
  Gauge,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import {
  generateCandles,
  INSTRUMENTS,
  type InstrumentKey,
  type Candle,
} from "@/lib/backtest/ohlc-generator";
import {
  loadSimTrades,
  saveSimTrades,
  clearSimTrades,
  openSimTrade,
  checkSimTradeAgainstCandle,
  closeSimTrade,
  unrealizedPnl,
  simTradesToTrades,
  type SimTrade,
} from "@/lib/backtest/engine";
import {
  calculateMetrics,
  buildEquityCurve,
} from "@/lib/journal/metrics";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  Cell,
} from "recharts";

const VISIBLE_CANDLES = 60; // candles shown in the viewport
const SPEEDS = [
  { label: "0.5×", ms: 2000 },
  { label: "1×", ms: 1000 },
  { label: "2×", ms: 500 },
  { label: "4×", ms: 250 },
];

export function ReplayPage() {
  const [instrument, setInstrument] = useState<InstrumentKey>("XAUUSD");
  const [seed, setSeed] = useState("velox-default");
  const [seedInput, setSeedInput] = useState("velox-default");
  const [candles, setCandles] = useState<Candle[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speedIdx, setSpeedIdx] = useState(1);
  const [simTrades, setSimTrades] = useState<SimTrade[]>([]);

  // Trade entry form
  const [direction, setDirection] = useState<"LONG" | "SHORT">("LONG");
  const [stopPips, setStopPips] = useState("10");
  const [targetPips, setTargetPips] = useState("20");
  const [quantity, setQuantity] = useState("0.10");

  const playRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const spec = INSTRUMENTS[instrument];

  // ── Generate candles when instrument or seed changes ──
  const regenerate = useCallback(() => {
    const c = generateCandles({ instrument, seed, count: 400, intervalMinutes: 60 });
    setCandles(c);
    setCurrentIndex(VISIBLE_CANDLES); // start partway in so there's history
    setPlaying(false);
  }, [instrument, seed]);

  useEffect(() => {
    regenerate();
  }, [regenerate]);

  // ── Load saved sim trades on mount ──
  useEffect(() => {
    setSimTrades(loadSimTrades());
  }, []);

  // ── Playback loop ──
  useEffect(() => {
    if (playing) {
      playRef.current = setInterval(() => {
        setCurrentIndex((i) => {
          if (i >= candles.length - 1) {
            setPlaying(false);
            return i;
          }
          return i + 1;
        });
      }, SPEEDS[speedIdx].ms);
    }
    return () => {
      if (playRef.current) clearInterval(playRef.current);
    };
  }, [playing, speedIdx, candles.length]);

  // ── Check open trades against each new candle ──
  useEffect(() => {
    if (candles.length === 0 || currentIndex === 0) return;
    const candle = candles[currentIndex];
    let changed = false;
    const updated = simTrades.map((t) => {
      if (t.status !== "open") return t;
      // Only check candles after entry.
      if (currentIndex <= t.entryCandleIndex) return t;
      const result = checkSimTradeAgainstCandle(
        t,
        candle.high,
        candle.low,
        currentIndex,
        new Date(candle.time).toISOString(),
      );
      if (result.status === "closed") {
        changed = true;
        toast.success(`${t.direction} ${t.symbol} closed`, {
          description: `${result.pnl! >= 0 ? "Profit" : "Loss"}: ${formatCurrency(result.pnl!, { sign: true })} (${result.rMultiple}R)`,
        });
      }
      return result;
    });
    if (changed) {
      setSimTrades(updated);
      saveSimTrades(updated);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex]);

  const persistTrades = useCallback((next: SimTrade[]) => {
    setSimTrades(next);
    saveSimTrades(next);
  }, []);

  // ── Derived data ──
  const currentCandle = candles[currentIndex];
  const currentPrice = currentCandle?.close ?? 0;

  const viewportCandles = useMemo(() => {
    const start = Math.max(0, currentIndex - VISIBLE_CANDLES + 1);
    return candles.slice(start, currentIndex + 1).map((c, i) => ({
      ...c,
      idx: start + i,
      // For the candle body: use [low, high] range so the Bar can render wicks.
      body: [c.low, c.high] as [number, number],
    }));
  }, [candles, currentIndex]);

  const openTrades = simTrades.filter((t) => t.status === "open");
  const closedTrades = simTrades.filter((t) => t.status === "closed");

  // Live unrealized P&L across open positions
  const floatingPnl = useMemo(
    () => openTrades.reduce((s, t) => s + unrealizedPnl(t, currentPrice), 0),
    [openTrades, currentPrice],
  );

  // Results analytics via shared metrics engine
  const metricsTrades = useMemo(() => simTradesToTrades(simTrades), [simTrades]);
  const metrics = useMemo(() => calculateMetrics(metricsTrades), [metricsTrades]);
  const equityCurve = useMemo(() => buildEquityCurve(metricsTrades), [metricsTrades]);

  // ── Actions ──
  const handleApplySeed = () => {
    setSeed(seedInput.trim() || "default");
    setSimTrades([]);
    clearSimTrades();
    toast.info("New market generated", { description: `Seed: ${seedInput || "default"}` });
  };

  const handleStep = () => {
    if (currentIndex < candles.length - 1) setCurrentIndex((i) => i + 1);
  };

  const handleReset = () => {
    setCurrentIndex(VISIBLE_CANDLES);
    setPlaying(false);
  };

  const handleClearTrades = () => {
    clearSimTrades();
    setSimTrades([]);
    toast.success("Backtest trades cleared");
  };

  const handleEnterTrade = () => {
    if (!currentCandle) return;
    const slPips = parseFloat(stopPips) || 0;
    const tpPips = parseFloat(targetPips) || 0;
    const qty = parseFloat(quantity) || 0.01;

    const slPrice =
      direction === "LONG"
        ? currentPrice - slPips * spec.pipSize
        : currentPrice + slPips * spec.pipSize;
    const tpPrice =
      direction === "LONG"
        ? currentPrice + tpPips * spec.pipSize
        : currentPrice - tpPips * spec.pipSize;

    const trade = openSimTrade({
      symbol: spec.symbol,
      direction,
      entryPrice: currentPrice,
      stopLoss: slPips > 0 ? round(slPrice, spec.digits) : null,
      takeProfit: tpPips > 0 ? round(tpPrice, spec.digits) : null,
      quantity: qty,
      entryCandleIndex: currentIndex,
      entryTime: new Date(currentCandle.time).toISOString(),
      pipSize: spec.pipSize,
      // $10 per pip per standard lot (1.0) — standard for these instruments.
      contractSize: 10,
    });

    persistTrades([...simTrades, trade]);
    toast.success(`${direction} ${spec.symbol} entered`, {
      description: `@ ${currentPrice} · SL ${slPips}p · TP ${tpPips}p · ${qty} lots`,
    });
  };

  const handleCloseTrade = (id: string) => {
    if (!currentCandle) return;
    const updated = simTrades.map((t) =>
      t.id === id && t.status === "open"
        ? closeSimTrade(t, currentPrice, currentIndex, new Date(currentCandle.time).toISOString())
        : t,
    );
    persistTrades(updated);
    const closed = updated.find((t) => t.id === id);
    if (closed?.pnl != null) {
      toast.success(`Position closed`, {
        description: `${closed.pnl >= 0 ? "Profit" : "Loss"}: ${formatCurrency(closed.pnl, { sign: true })} (${closed.rMultiple}R)`,
      });
    }
  };

  const progressPct = candles.length > 0 ? ((currentIndex + 1) / candles.length) * 100 : 0;

  return (
    <PageTransition className="space-y-6">
      {/* Header */}
      <FadeIn>
        <div className="glass-subtle rounded-xl border border-border/60 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-brand/10 border border-brand/20 flex items-center justify-center">
              <Activity className="w-5 h-5 text-brand" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Backtesting Replay</h1>
              <p className="text-xs text-foreground-muted">
                Step through historical data, log simulated trades, test your edge risk-free.
              </p>
            </div>
          </div>
          <Badge variant="outline" className="text-[10px]">
            Simulated · Saved locally · Real journal untouched
          </Badge>
        </div>
      </FadeIn>

      {/* Market config + controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1">
              <Label className="text-[10px]">Instrument</Label>
              <Select
                value={instrument}
                onChange={(e) => setInstrument(e.target.value as InstrumentKey)}
                className="w-32"
              >
                {Object.keys(INSTRUMENTS).map((k) => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-1 flex-1 min-w-[160px]">
              <Label className="text-[10px]">Market Seed (deterministic)</Label>
              <div className="flex gap-2">
                <Input
                  value={seedInput}
                  onChange={(e) => setSeedInput(e.target.value)}
                  placeholder="any-text-seed"
                  className="font-mono text-xs"
                />
                <Button size="sm" variant="secondary" onClick={handleApplySeed}>
                  <RotateCcw className="w-3.5 h-3.5" /> Generate
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <Button size="sm" variant={playing ? "secondary" : "primary"} onClick={() => setPlaying((p) => !p)}>
                {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                {playing ? "Pause" : "Play"}
              </Button>
              <Button size="sm" variant="outline" onClick={handleStep} disabled={playing}>
                <SkipForward className="w-3.5 h-3.5" /> Step
              </Button>
              <Button size="sm" variant="ghost" onClick={handleReset}>
                <RotateCcw className="w-3.5 h-3.5" />
              </Button>
            </div>
            <div className="flex items-center rounded-lg border border-border bg-surface p-0.5">
              {SPEEDS.map((s, i) => (
                <button
                  key={s.label}
                  onClick={() => setSpeedIdx(i)}
                  className={cn(
                    "px-2 py-1 text-[11px] font-bold rounded-md transition-all",
                    speedIdx === i ? "bg-brand text-white" : "text-foreground-muted hover:text-foreground",
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          {/* Progress bar */}
          <div className="mt-3 h-1 rounded-full bg-surface-3 overflow-hidden">
            <div className="h-full bg-brand rounded-full transition-all" style={{ width: `${progressPct}%` }} />
          </div>
          <p className="text-[10px] text-foreground-subtle mt-1 font-mono">
            Candle {currentIndex + 1} / {candles.length} · {spec.symbol} @ {currentPrice}
          </p>
        </CardContent>
      </Card>

      {/* Price chart + trade entry */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-8 card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Gauge className="w-4 h-4 text-brand" />
                {spec.symbol} · H1
              </span>
              <span className="font-mono text-base font-bold tabular">{currentPrice}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="h-72 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={viewportCandles}>
                <XAxis dataKey="idx" stroke="#475569" fontSize={9} tickLine={false} axisLine={false} />
                <YAxis
                  stroke="#475569"
                  fontSize={9}
                  tickLine={false}
                  axisLine={false}
                  domain={["dataMin - 5", "dataMax + 5"]}
                  orientation="right"
                />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0f172a", borderColor: "#1e293b", borderRadius: "8px", fontSize: "10px" }}
                  formatter={(_val, _name, props) => {
                    const c = props?.payload as Candle | undefined;
                    return c ? [`O:${c.open} H:${c.high} L:${c.low} C:${c.close}`, spec.symbol] : ["", ""];
                  }}
                />
                {/* Candle wicks (low→high as a thin bar) */}
                <Bar dataKey="body" barSize={3} radius={[1, 1, 0, 0]}>
                  {viewportCandles.map((c, i) => (
                    <Cell key={i} fill={c.close >= c.open ? "#34d39955" : "#fb718555"} />
                  ))}
                </Bar>
                {/* Close price line */}
                <Line type="monotone" dataKey="close" stroke="var(--brand)" strokeWidth={1.5} dot={false} />
                {/* Current price marker */}
                <ReferenceLine y={currentPrice} stroke="var(--brand)" strokeDasharray="3 3" strokeWidth={1} />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Trade entry panel */}
        <Card className="lg:col-span-4 card-hover">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="w-4 h-4 text-brand" />
              Enter Simulated Trade
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Direction toggle */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setDirection("LONG")}
                className={cn(
                  "flex items-center justify-center gap-1.5 py-2.5 rounded-lg border text-sm font-bold transition-all",
                  direction === "LONG"
                    ? "border-profit bg-profit/15 text-profit"
                    : "border-border text-foreground-muted hover:border-profit/40",
                )}
              >
                <TrendingUp className="w-4 h-4" /> LONG
              </button>
              <button
                onClick={() => setDirection("SHORT")}
                className={cn(
                  "flex items-center justify-center gap-1.5 py-2.5 rounded-lg border text-sm font-bold transition-all",
                  direction === "SHORT"
                    ? "border-loss bg-loss/15 text-loss"
                    : "border-border text-foreground-muted hover:border-loss/40",
                )}
              >
                <TrendingDown className="w-4 h-4" /> SHORT
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[10px]">Stop Loss (pips)</Label>
                <Input type="number" value={stopPips} onChange={(e) => setStopPips(e.target.value)} className="text-xs font-mono" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px]">Take Profit (pips)</Label>
                <Input type="number" value={targetPips} onChange={(e) => setTargetPips(e.target.value)} className="text-xs font-mono" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px]">Quantity (lots)</Label>
              <Input type="number" step="0.01" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="text-xs font-mono" />
            </div>

            <div className="text-[10px] text-foreground-subtle space-y-0.5 pt-1">
              <div className="flex justify-between">
                <span>Risk ($)</span>
                <span className="font-mono text-loss">{formatCurrency((parseFloat(stopPips) || 0) * 10 * (parseFloat(quantity) || 0))}</span>
              </div>
              <div className="flex justify-between">
                <span>Reward ($)</span>
                <span className="font-mono text-profit">{formatCurrency((parseFloat(targetPips) || 0) * 10 * (parseFloat(quantity) || 0))}</span>
              </div>
              <div className="flex justify-between">
                <span>R:R</span>
                <span className="font-mono text-brand">
                  {(parseFloat(targetPips) || 0) / (parseFloat(stopPips) || 1) || 0}
                </span>
              </div>
            </div>

            <Button className="w-full" onClick={handleEnterTrade}>
              <Zap className="w-4 h-4" />
              Enter {direction} @ {currentPrice}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Open positions + Results */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Open positions */}
        <Card className="lg:col-span-5 card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-brand" />
                Open Positions ({openTrades.length})
              </span>
              {openTrades.length > 0 && (
                <Badge variant={floatingPnl >= 0 ? "profit" : "loss"} className="text-[10px]">
                  Floating {formatCurrency(floatingPnl, { sign: true })}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-64 overflow-y-auto">
            {openTrades.length === 0 ? (
              <p className="text-xs text-foreground-subtle text-center py-6">No open positions.</p>
            ) : (
              openTrades.map((t) => {
                const pnl = unrealizedPnl(t, currentPrice);
                return (
                  <div key={t.id} className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-surface-2/30">
                    <div className="flex items-center gap-2">
                      <Badge variant={t.direction === "LONG" ? "profit" : "loss"} className="text-[9px]">{t.direction}</Badge>
                      <div>
                        <p className="text-xs font-bold">{t.symbol}</p>
                        <p className="text-[10px] text-foreground-subtle font-mono">
                          @ {t.entryPrice} · SL {t.stopLoss} · {t.quantity} lots
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn("text-xs font-mono font-bold", pnl >= 0 ? "text-profit" : "text-loss")}>
                        {formatCurrency(pnl, { sign: true })}
                      </span>
                      <Button size="icon-sm" variant="ghost" onClick={() => handleCloseTrade(t.id)} title="Close at market">
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Results */}
        <Card className="lg:col-span-7 card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between">
              <span className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-brand" />
                Backtest Results
              </span>
              {simTrades.length > 0 && (
                <Button size="icon-sm" variant="ghost" onClick={handleClearTrades} title="Clear all sim trades">
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              )}
            </CardTitle>
            <CardDescription>{closedTrades.length} closed · {simTrades.length} total simulated trades</CardDescription>
          </CardHeader>
          <CardContent>
            {closedTrades.length === 0 ? (
              <p className="text-xs text-foreground-subtle text-center py-8">
                Enter and close trades to see backtest performance metrics.
              </p>
            ) : (
              <>
                <div className="grid grid-cols-4 gap-3 mb-4">
                  <ResultStat label="Net P&L" value={<AnimatedCounter value={metrics.netPnl} format="currency" signed />} tone={metrics.netPnl >= 0 ? "text-profit" : "text-loss"} />
                  <ResultStat label="Win Rate" value={<><AnimatedCounter value={metrics.winRate * 100} format="decimal" decimals={1} />%</>} tone="text-brand" />
                  <ResultStat label="Profit Factor" value={metrics.profitFactor === Infinity ? "∞" : <AnimatedCounter value={metrics.profitFactor} format="decimal" decimals={2} />} tone={metrics.profitFactor >= 1.5 ? "text-profit" : "text-loss"} />
                  <ResultStat label="Expectancy" value={<AnimatedCounter value={metrics.expectancy} format="currency" signed />} tone={metrics.expectancy >= 0 ? "text-profit" : "text-loss"} />
                </div>
                {equityCurve.length > 1 && (
                  <div className="h-32">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={equityCurve}>
                        <XAxis dataKey="index" stroke="#475569" fontSize={9} tickLine={false} axisLine={false} />
                        <YAxis stroke="#475569" fontSize={9} tickLine={false} axisLine={false} orientation="right" />
                        <Tooltip
                          contentStyle={{ backgroundColor: "var(--surface)", borderColor: "var(--border)", borderRadius: "8px", fontSize: "10px", color: "var(--foreground)" }}
                          formatter={(val) => [formatCurrency(Number(val)), "Equity"]}
                        />
                        <Line type="monotone" dataKey="equity" stroke="var(--brand)" strokeWidth={2} dot={false} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
}

function ResultStat({ label, value, tone }: { label: string; value: React.ReactNode; tone: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface-2/30 p-2.5">
      <p className="text-[9px] text-foreground-subtle uppercase tracking-wider font-bold">{label}</p>
      <p className={cn("text-lg font-bold font-mono tabular mt-0.5", tone)}>{value}</p>
    </div>
  );
}

function round(n: number, digits: number): number {
  const f = Math.pow(10, digits);
  return Math.round(n * f) / f;
}
