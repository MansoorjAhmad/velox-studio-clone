"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Calculator,
  Copy,
  Check,
  AlertTriangle,
  TrendingUp,
  ShieldAlert,
  Coins,
  Info,
  ChevronDown,
  Target,
  Zap,
  ArrowUpDown,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ════════════════════════════════════════════════════════════════
//  TYPES & CONSTANTS
// ════════════════════════════════════════════════════════════════

type AccountType = "standard" | "cent";
type RiskMode = "percent" | "fixed";
type SlTpMode = "price" | "pips";
type InstrumentKey = "XAUUSD" | "EURUSD" | "GBPUSD" | "USDJPY" | "NAS100" | "CUSTOM";
type LotRounding = "exact" | "0.01" | "0.02" | "0.05" | "0.10";

interface InstrumentPreset {
  name: string;
  flag: string;
  defaultPrice: number;
  defaultSlPips: number;
  defaultTpPips: number;
  pipSize: number;
  pipValuePerLot: number; // USD value of 1 pip for 1.0 Standard Lot
  decimals: number; // display decimals for price
}

const INSTRUMENTS: Record<InstrumentKey, InstrumentPreset> = {
  XAUUSD: {
    name: "XAUUSD",
    flag: "🥇",
    defaultPrice: 2650.0,
    defaultSlPips: 5.0,
    defaultTpPips: 15.0,
    pipSize: 0.01,
    pipValuePerLot: 1.0, // $1 price move × 100 = $100; pipSize=0.01 → $1 pip = $100/100... handled below
    decimals: 2,
  },
  EURUSD: {
    name: "EURUSD",
    flag: "🇪🇺",
    defaultPrice: 1.085,
    defaultSlPips: 20,
    defaultTpPips: 50,
    pipSize: 0.0001,
    pipValuePerLot: 10, // $10 per pip per Standard Lot
    decimals: 5,
  },
  GBPUSD: {
    name: "GBPUSD",
    flag: "🇬🇧",
    defaultPrice: 1.27,
    defaultSlPips: 25,
    defaultTpPips: 75,
    pipSize: 0.0001,
    pipValuePerLot: 10,
    decimals: 5,
  },
  USDJPY: {
    name: "USDJPY",
    flag: "🇯🇵",
    defaultPrice: 155.0,
    defaultSlPips: 30,
    defaultTpPips: 90,
    pipSize: 0.01,
    pipValuePerLot: 6.45, // ~$6.45 per pip (depends on JPY rate; approximate)
    decimals: 3,
  },
  NAS100: {
    name: "NAS100",
    flag: "📈",
    defaultPrice: 21000.0,
    defaultSlPips: 50,
    defaultTpPips: 150,
    pipSize: 1.0,
    pipValuePerLot: 1.0, // $1 per point per 0.01 lot — handled via index logic
    decimals: 1,
  },
  CUSTOM: {
    name: "Custom",
    flag: "⚙️",
    defaultPrice: 100.0,
    defaultSlPips: 10,
    defaultTpPips: 30,
    pipSize: 0.01,
    pipValuePerLot: 10,
    decimals: 2,
  },
};

const RISK_PRESETS = [0.5, 1.0, 1.5, 2.0];
const LOT_ROUNDINGS: LotRounding[] = ["exact", "0.01", "0.02", "0.05", "0.10"];

// ════════════════════════════════════════════════════════════════
//  LOT SIZE ENGINE
// ════════════════════════════════════════════════════════════════

function calcLotSize(
  cashRisk: number,
  slPips: number,
  instrument: InstrumentKey,
  isCent: boolean,
  entryPrice: number,
): number {
  if (slPips <= 0 || cashRisk <= 0) return 0;
  const preset = INSTRUMENTS[instrument];

  let pipVal = preset.pipValuePerLot;

  if (instrument === "XAUUSD") {
    // Gold: 1 pip (0.01) move on 1 Lot = $1. So pipValuePerLot = $1
    pipVal = 1.0;
  } else if (instrument === "USDJPY") {
    // ~$6.45 at 155; adjust dynamically
    pipVal = (0.01 / (entryPrice || 155)) * 100000;
  } else if (instrument === "NAS100") {
    // 1 point on 1.0 lot = $1 (CFD-style)
    pipVal = 1.0;
  }

  // Cent accounts: pip value is 100× smaller in USD terms (or cashRisk is in USC)
  // cashRisk is already denominated correctly (USC for cent, USD for standard)
  // pipVal is always in USD → scale to USC for cent
  const scaledPipVal = isCent ? pipVal * 100 : pipVal;

  const lots = cashRisk / (slPips * scaledPipVal);
  return lots;
}

function applyRounding(lots: number, rounding: LotRounding): number {
  if (rounding === "exact") return Number(lots.toFixed(2));
  const step = parseFloat(rounding);
  return Number((Math.floor(lots / step) * step).toFixed(2));
}

// ════════════════════════════════════════════════════════════════
//  RISK METER COMPONENT
// ════════════════════════════════════════════════════════════════

function RiskMeter({ pct }: { pct: number }) {
  const capped = Math.min(pct, 5);
  const fill = (capped / 5) * 100;
  const color =
    pct <= 1 ? "from-profit to-emerald-400" :
    pct <= 2 ? "from-brand to-info" :
    pct <= 3 ? "from-amber-400 to-amber-500" :
    "from-loss to-red-600";
  const label =
    pct <= 1 ? "Conservative" :
    pct <= 2 ? "Moderate" :
    pct <= 3 ? "Aggressive" :
    "Danger Zone";
  const textColor =
    pct <= 1 ? "text-profit" :
    pct <= 2 ? "text-brand" :
    pct <= 3 ? "text-amber-400" :
    "text-loss";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-foreground-subtle font-medium">Risk Level</span>
        <span className={cn("font-bold", textColor)}>{label} · {pct.toFixed(2)}%</span>
      </div>
      <div className="h-2.5 w-full rounded-full bg-surface-3 overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-500 bg-gradient-to-r", color)}
          style={{ width: `${fill}%` }}
        />
      </div>
      <div className="flex justify-between text-[9px] text-foreground-subtle font-mono">
        <span>0%</span><span>1%</span><span>2%</span><span>3%</span><span>4%</span><span>5%+</span>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
//  PRICE LADDER VISUALIZER
// ════════════════════════════════════════════════════════════════

function PriceLadder({
  entry, sl, tp1, tp2, decimals,
}: {
  entry: number; sl: number; tp1: number; tp2: number; decimals: number;
}) {
  const isLong = entry > sl;
  const prices = [sl, entry, tp1, tp2].filter(p => p > 0);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;

  const pctOf = (p: number) => ((p - min) / range) * 100;

  const fmt = (p: number) => p.toFixed(decimals > 3 ? 5 : decimals);

  return (
    <div className="rounded-lg border border-border bg-surface-2/60 p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-foreground-subtle mb-3">
        Price Ladder {isLong ? "📈 Long" : "📉 Short"}
      </p>
      <div className="relative h-28 mx-3">
        {/* Track */}
        <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-0.5 bg-border rounded-full" />

        {/* SL zone (loss fill) */}
        {isLong ? (
          <div
            className="absolute left-1/2 -translate-x-[1px] w-1 bg-loss/30 rounded-sm"
            style={{
              bottom: `${pctOf(entry)}%`,
              height: `${pctOf(entry) - pctOf(sl)}%`,
            }}
          />
        ) : (
          <div
            className="absolute left-1/2 -translate-x-[1px] w-1 bg-loss/30 rounded-sm"
            style={{
              top: `${100 - pctOf(entry)}%`,
              height: `${pctOf(sl) - pctOf(entry)}%`,
            }}
          />
        )}

        {/* TP zone (profit fill) */}
        {isLong ? (
          <div
            className="absolute left-1/2 -translate-x-[1px] w-1 bg-profit/30 rounded-sm"
            style={{
              bottom: `${pctOf(tp2 > 0 ? tp2 : tp1)}%`,
              height: `${pctOf(tp2 > 0 ? tp2 : tp1) - pctOf(entry)}%`,
              top: `${100 - pctOf(tp2 > 0 ? tp2 : tp1)}%`,
            }}
          />
        ) : null}

        {/* SL dot */}
        <PriceDot pct={pctOf(sl)} label={fmt(sl)} tag="SL" color="bg-loss" textColor="text-loss" side="right" />
        {/* Entry dot */}
        <PriceDot pct={pctOf(entry)} label={fmt(entry)} tag="Entry" color="bg-brand" textColor="text-brand" side="left" />
        {/* TP1 dot */}
        {tp1 > 0 && <PriceDot pct={pctOf(tp1)} label={fmt(tp1)} tag="TP1" color="bg-profit" textColor="text-profit" side="right" />}
        {/* TP2 dot */}
        {tp2 > 0 && tp2 !== tp1 && <PriceDot pct={pctOf(tp2)} label={fmt(tp2)} tag="TP2" color="bg-emerald-300" textColor="text-emerald-300" side="left" />}
      </div>
    </div>
  );
}

function PriceDot({ pct, label, tag, color, textColor, side }: {
  pct: number; label: string; tag: string; color: string; textColor: string; side: "left" | "right";
}) {
  return (
    <div
      className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1.5"
      style={{ bottom: `${pct}%`, transform: "translate(-50%, 50%)" }}
    >
      <div className={cn("w-3 h-3 rounded-full border-2 border-surface shrink-0", color)} />
      <div
        className={cn(
          "absolute flex items-center gap-1 whitespace-nowrap",
          side === "right" ? "left-5" : "right-5 flex-row-reverse",
        )}
      >
        <span className={cn("text-[9px] font-bold uppercase", textColor)}>{tag}</span>
        <span className="text-[9px] font-mono text-foreground-subtle">{label}</span>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
//  MAIN CALCULATOR
// ════════════════════════════════════════════════════════════════

export function PositionCalculator() {
  const [accountType, setAccountType] = useState<AccountType>("standard");
  const [instrument, setInstrument] = useState<InstrumentKey>("XAUUSD");
  const [balance, setBalance] = useState<number>(1000);
  const [riskMode, setRiskMode] = useState<RiskMode>("percent");
  const [riskValue, setRiskValue] = useState<number>(1);
  const [slTpMode, setSlTpMode] = useState<SlTpMode>("price");
  const [entryPrice, setEntryPrice] = useState<number>(INSTRUMENTS.XAUUSD.defaultPrice);
  const [stopLossPrice, setStopLossPrice] = useState<number>(
    INSTRUMENTS.XAUUSD.defaultPrice - INSTRUMENTS.XAUUSD.defaultSlPips
  );
  const [tp1Price, setTp1Price] = useState<number>(
    INSTRUMENTS.XAUUSD.defaultPrice + INSTRUMENTS.XAUUSD.defaultTpPips
  );
  const [tp2Price, setTp2Price] = useState<number>(
    INSTRUMENTS.XAUUSD.defaultPrice + INSTRUMENTS.XAUUSD.defaultTpPips * 2
  );
  // Pips mode values
  const [slPipsInput, setSlPipsInput] = useState<number>(INSTRUMENTS.XAUUSD.defaultSlPips);
  const [tp1PipsInput, setTp1PipsInput] = useState<number>(INSTRUMENTS.XAUUSD.defaultTpPips);
  const [tp2PipsInput, setTp2PipsInput] = useState<number>(INSTRUMENTS.XAUUSD.defaultTpPips * 2);

  const [lotRounding, setLotRounding] = useState<LotRounding>("0.01");
  const [copied, setCopied] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const isCent = accountType === "cent";
  const currencySymbol = isCent ? "USC" : "$";
  const preset = INSTRUMENTS[instrument];

  // ── Instrument change ──
  const handleInstrumentChange = (key: InstrumentKey) => {
    setInstrument(key);
    const p = INSTRUMENTS[key];
    setEntryPrice(p.defaultPrice);
    setStopLossPrice(p.defaultPrice - p.defaultSlPips);
    setTp1Price(p.defaultPrice + p.defaultTpPips);
    setTp2Price(p.defaultPrice + p.defaultTpPips * 2);
    setSlPipsInput(p.defaultSlPips);
    setTp1PipsInput(p.defaultTpPips);
    setTp2PipsInput(p.defaultTpPips * 2);
  };

  // ── Derived SL/TP prices (from pips if in pip mode) ──
  const effectiveSl = useMemo(() => {
    if (slTpMode === "price") return stopLossPrice;
    const isLong = true; // assume long for pips mode; direction from sl side
    return entryPrice - slPipsInput * preset.pipSize;
  }, [slTpMode, stopLossPrice, entryPrice, slPipsInput, preset.pipSize]);

  const effectiveTp1 = useMemo(() => {
    if (slTpMode === "price") return tp1Price;
    return entryPrice + tp1PipsInput * preset.pipSize;
  }, [slTpMode, tp1Price, entryPrice, tp1PipsInput, preset.pipSize]);

  const effectiveTp2 = useMemo(() => {
    if (slTpMode === "price") return tp2Price;
    return entryPrice + tp2PipsInput * preset.pipSize;
  }, [slTpMode, tp2Price, entryPrice, tp2PipsInput, preset.pipSize]);

  // ── Distances in pips ──
  const slPips = useMemo(() => Math.abs(entryPrice - effectiveSl) / preset.pipSize, [entryPrice, effectiveSl, preset.pipSize]);
  const tp1Pips = useMemo(() => Math.abs(effectiveTp1 - entryPrice) / preset.pipSize, [effectiveTp1, entryPrice, preset.pipSize]);
  const tp2Pips = useMemo(() => Math.abs(effectiveTp2 - entryPrice) / preset.pipSize, [effectiveTp2, entryPrice, preset.pipSize]);

  // ── Cash risk ──
  const cashRisk = useMemo(() => {
    if (riskMode === "percent") {
      const baseRisk = balance * (riskValue / 100);
      return isCent ? baseRisk * 100 : baseRisk;
    }
    return riskValue;
  }, [riskMode, riskValue, balance, isCent]);

  const effectiveRiskPercent = useMemo(() => {
    if (riskMode === "percent") return riskValue;
    const baseRiskInUsd = isCent ? cashRisk / 100 : cashRisk;
    return balance > 0 ? (baseRiskInUsd / balance) * 100 : 0;
  }, [riskMode, riskValue, cashRisk, balance, isCent]);

  // ── Lot sizes ──
  const rawLots = useMemo(() => calcLotSize(cashRisk, slPips, instrument, isCent, entryPrice), [cashRisk, slPips, instrument, isCent, entryPrice]);
  const lotSize = useMemo(() => applyRounding(rawLots, lotRounding), [rawLots, lotRounding]);

  // TP1 = 50% close at 1:1 R:R
  const tp1ClosePct = 0.5;
  const tp1Lots = applyRounding(lotSize * tp1ClosePct, lotRounding);
  const runnerLots = applyRounding(lotSize - tp1Lots, lotRounding);

  // ── P&L ──
  const rrTp1 = slPips > 0 ? tp1Pips / slPips : 0;
  const rrTp2 = slPips > 0 ? tp2Pips / slPips : 0;

  const rewardTp1 = cashRisk * rrTp1 * tp1ClosePct;
  const rewardTp2 = cashRisk * rrTp2 * (1 - tp1ClosePct);
  const totalReward = rewardTp1 + rewardTp2;

  // Break-even SL after TP1 hit (move SL to entry)
  const breakEvenSl = entryPrice;

  // ── Copy handler ──
  const handleCopy = (text: string, key: string) => {
    navigator.clipboard?.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  // ── Reset ──
  const handleReset = () => {
    handleInstrumentChange(instrument);
    setRiskValue(1);
    setRiskMode("percent");
    setLotRounding("0.01");
  };

  const displayBalance = isCent ? balance * 100 : balance;

  return (
    <div className="w-full space-y-0 rounded-2xl border border-border bg-surface overflow-hidden shadow-2xl">
      {/* ══ HEADER ══ */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-6 py-4 border-b border-border bg-surface-2/40">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 border border-brand/20 text-brand">
            <Calculator className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight">Position Size Calculator</h2>
            <p className="text-xs text-foreground-muted">Precision lot sizing · Risk management</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Reset button */}
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-foreground-subtle border border-border hover:bg-surface-2 hover:text-foreground transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Reset
          </button>

          {/* Account Type Toggle */}
          <button
            type="button"
            onClick={() => setAccountType(isCent ? "standard" : "cent")}
            className={cn(
              "flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-all",
              isCent
                ? "border-amber-500/40 bg-amber-500/10 text-amber-400"
                : "border-brand/30 bg-brand/5 text-brand",
            )}
          >
            <Coins className="h-4 w-4" />
            <span>{isCent ? "Cent (USC)" : "Standard (USD)"}</span>
            <div
              className={cn(
                "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
                isCent ? "bg-amber-500" : "bg-brand",
              )}
            >
              <span
                className={cn(
                  "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition duration-200",
                  isCent ? "translate-x-4" : "translate-x-0",
                )}
              />
            </div>
          </button>
        </div>
      </div>

      {/* ══ INSTRUMENT TABS ══ */}
      <div className="flex gap-0 border-b border-border overflow-x-auto">
        {(Object.keys(INSTRUMENTS) as InstrumentKey[]).map((key) => {
          const p = INSTRUMENTS[key];
          return (
            <button
              key={key}
              onClick={() => handleInstrumentChange(key)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition-all border-b-2 -mb-px",
                instrument === key
                  ? "border-brand text-brand bg-brand/5"
                  : "border-transparent text-foreground-subtle hover:text-foreground hover:bg-surface-2/50",
              )}
            >
              <span>{p.flag}</span>
              <span>{p.name}</span>
            </button>
          );
        })}
      </div>

      {/* ══ MAIN GRID ══ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">

        {/* ─── LEFT: INPUTS ─── */}
        <div className="lg:col-span-7 p-6 space-y-5 border-r border-border">

          {/* SL/TP Mode toggle */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-foreground-subtle">
              Trade Parameters
            </span>
            <div className="flex items-center gap-1 bg-surface-2 rounded-lg p-1 border border-border">
              {(["price", "pips"] as SlTpMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setSlTpMode(m)}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-[10px] font-bold uppercase transition-all",
                    slTpMode === m
                      ? "bg-brand text-brand-foreground shadow-sm"
                      : "text-foreground-muted hover:text-foreground",
                  )}
                >
                  {m === "price" ? "💰 Price" : "📐 Pips"}
                </button>
              ))}
            </div>
          </div>

          {/* Account Balance + Risk Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-foreground-muted">
                Account Balance ({currencySymbol})
              </Label>
              <div className="relative">
                <Input
                  type="number"
                  value={displayBalance}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    setBalance(isCent ? val / 100 : val);
                  }}
                  className="font-mono bg-surface-2 pl-7"
                  placeholder="1000"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-foreground-subtle font-bold">
                  {isCent ? "¢" : "$"}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-foreground-muted">Risk Amount</Label>
                <div className="flex items-center gap-0.5">
                  {(["percent", "fixed"] as RiskMode[]).map((m) => (
                    <button
                      key={m}
                      onClick={() => setRiskMode(m)}
                      className={cn(
                        "rounded px-1.5 py-0.5 text-[9px] font-bold uppercase transition-all",
                        riskMode === m
                          ? "bg-brand text-brand-foreground"
                          : "bg-surface-3 text-foreground-subtle hover:text-foreground",
                      )}
                    >
                      {m === "percent" ? "%" : currencySymbol}
                    </button>
                  ))}
                </div>
              </div>
              <div className="relative">
                <Input
                  type="number"
                  step="0.1"
                  value={riskValue}
                  onChange={(e) => setRiskValue(parseFloat(e.target.value) || 0)}
                  className={cn(
                    "font-mono bg-surface-2 pr-8",
                    effectiveRiskPercent > 2 && "border-amber-500/50 focus:border-amber-500",
                    effectiveRiskPercent > 3 && "border-loss/60 focus:border-loss",
                  )}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-foreground-subtle font-bold">
                  {riskMode === "percent" ? "%" : currencySymbol}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Risk Presets */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-foreground-subtle">
              Quick Risk Preset
            </span>
            <div className="flex gap-2">
              {RISK_PRESETS.map((pct) => (
                <button
                  key={pct}
                  onClick={() => { setRiskMode("percent"); setRiskValue(pct); }}
                  className={cn(
                    "flex-1 rounded-lg border py-2 text-xs font-bold transition-all",
                    riskMode === "percent" && riskValue === pct
                      ? "border-brand bg-brand/15 text-brand"
                      : "border-border bg-surface-2 text-foreground-muted hover:border-brand/40 hover:text-foreground",
                  )}
                >
                  {pct}%
                </button>
              ))}
            </div>
          </div>

          {/* Risk Meter */}
          <RiskMeter pct={effectiveRiskPercent} />

          {/* Entry / SL / TP inputs */}
          <div className="space-y-3">
            {/* Entry */}
            <div className="space-y-1.5">
              <Label className="text-xs text-foreground-muted flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-brand inline-block" />
                Entry Price
              </Label>
              <Input
                type="number"
                step="any"
                value={entryPrice}
                onChange={(e) => setEntryPrice(parseFloat(e.target.value) || 0)}
                className="font-mono bg-surface-2 border-brand/20 focus:border-brand"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Stop Loss */}
              <div className="space-y-1.5">
                <Label className="text-xs text-foreground-muted flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-loss inline-block" />
                    Stop Loss
                  </span>
                  <span className="font-mono text-loss">
                    {slPips.toFixed(1)} pips
                  </span>
                </Label>
                {slTpMode === "price" ? (
                  <Input
                    type="number" step="any"
                    value={stopLossPrice}
                    onChange={(e) => setStopLossPrice(parseFloat(e.target.value) || 0)}
                    className="font-mono bg-surface-2 border-loss/30 focus:border-loss"
                  />
                ) : (
                  <div className="relative">
                    <Input
                      type="number" step="0.1"
                      value={slPipsInput}
                      onChange={(e) => setSlPipsInput(parseFloat(e.target.value) || 0)}
                      className="font-mono bg-surface-2 border-loss/30 focus:border-loss pr-12"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-loss font-bold">pips</span>
                  </div>
                )}
              </div>

              {/* TP1 */}
              <div className="space-y-1.5">
                <Label className="text-xs text-foreground-muted flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-profit inline-block" />
                    TP1 (50% close)
                  </span>
                  <span className="font-mono text-profit">
                    {rrTp1.toFixed(2)}R
                  </span>
                </Label>
                {slTpMode === "price" ? (
                  <Input
                    type="number" step="any"
                    value={tp1Price}
                    onChange={(e) => setTp1Price(parseFloat(e.target.value) || 0)}
                    className="font-mono bg-surface-2 border-profit/30 focus:border-profit"
                  />
                ) : (
                  <div className="relative">
                    <Input
                      type="number" step="0.1"
                      value={tp1PipsInput}
                      onChange={(e) => setTp1PipsInput(parseFloat(e.target.value) || 0)}
                      className="font-mono bg-surface-2 border-profit/30 focus:border-profit pr-12"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-profit font-bold">pips</span>
                  </div>
                )}
              </div>
            </div>

            {/* TP2 / Runner */}
            <div className="space-y-1.5">
              <Label className="text-xs text-foreground-muted flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                  TP2 / Runner (50% hold)
                </span>
                <span className="font-mono text-emerald-400">
                  {rrTp2.toFixed(2)}R
                </span>
              </Label>
              {slTpMode === "price" ? (
                <Input
                  type="number" step="any"
                  value={tp2Price}
                  onChange={(e) => setTp2Price(parseFloat(e.target.value) || 0)}
                  className="font-mono bg-surface-2 border-emerald-400/30 focus:border-emerald-400"
                />
              ) : (
                <div className="relative">
                  <Input
                    type="number" step="0.1"
                    value={tp2PipsInput}
                    onChange={(e) => setTp2PipsInput(parseFloat(e.target.value) || 0)}
                    className="font-mono bg-surface-2 border-emerald-400/30 focus:border-emerald-400 pr-12"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-emerald-400 font-bold">pips</span>
                </div>
              )}
            </div>
          </div>

          {/* ── ADVANCED ── */}
          <div>
            <button
              onClick={() => setShowAdvanced(v => !v)}
              className="flex items-center gap-1.5 text-xs text-foreground-subtle hover:text-foreground transition-colors"
            >
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", showAdvanced && "rotate-180")} />
              Advanced Options
            </button>
            {showAdvanced && (
              <div className="mt-3 space-y-3 rounded-lg border border-border/60 bg-surface-2/40 p-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-foreground-muted">Lot Size Rounding</Label>
                  <div className="flex flex-wrap gap-2">
                    {LOT_ROUNDINGS.map((r) => (
                      <button
                        key={r}
                        onClick={() => setLotRounding(r)}
                        className={cn(
                          "rounded-md border px-2.5 py-1 text-xs font-mono font-semibold transition-all",
                          lotRounding === r
                            ? "border-brand bg-brand/15 text-brand"
                            : "border-border bg-surface text-foreground-subtle hover:border-brand/30 hover:text-foreground",
                        )}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-foreground-subtle">
                    {lotRounding === "exact" ? "Shows exact mathematical result (2 decimals)." : `Rounds DOWN to nearest ${lotRounding} lot — never over-risks.`}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* High Risk Warning */}
          {effectiveRiskPercent > 2 && (
            <div className={cn(
              "flex items-start gap-2.5 rounded-lg border p-3 text-xs",
              effectiveRiskPercent > 3
                ? "border-loss/40 bg-loss/8 text-loss"
                : "border-amber-500/30 bg-amber-500/10 text-amber-300",
            )}>
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">
                  {effectiveRiskPercent > 3 ? "⚠️ High Risk — " : "Risk Warning — "}
                </span>
                Risking <span className="font-mono font-bold">{effectiveRiskPercent.toFixed(2)}%</span> on this trade.
                {effectiveRiskPercent > 3
                  ? " This exceeds 3% — extremely dangerous for account longevity."
                  : " Professional risk models suggest staying at or below 1–2%."}
              </div>
            </div>
          )}
        </div>

        {/* ─── RIGHT: OUTPUT ─── */}
        <div className="lg:col-span-5 flex flex-col bg-surface-2/30">

          {/* Lot Size Hero */}
          <div className="relative p-6 border-b border-border overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-brand/5 via-transparent to-transparent pointer-events-none" />
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand/10 blur-[40px] rounded-full pointer-events-none" />

            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-foreground-subtle flex items-center gap-1">
                  <Zap className="w-3 h-3 text-brand" />
                  Recommended Lot Size
                </span>
                <Badge variant={isCent ? "warning" : "info"} className="text-[9px]">
                  {isCent ? "Cent Lots" : "Std Lots"}
                </Badge>
              </div>

              <div className="flex items-baseline gap-3 mb-1">
                <span className="text-5xl font-black tracking-tight text-brand font-mono tabular">
                  {lotSize}
                </span>
                <span className="text-base font-semibold text-foreground-subtle">Lots</span>
              </div>
              {lotRounding !== "exact" && (
                <p className="text-[10px] text-foreground-subtle font-mono">
                  Exact: {rawLots.toFixed(4)} → rounded to {lotRounding}
                </p>
              )}

              <Button
                onClick={() => handleCopy(lotSize.toString(), "lot")}
                className="mt-4 w-full bg-brand text-brand-foreground hover:bg-brand/90 font-bold h-9 text-sm"
                size="sm"
              >
                {copied === "lot" ? (
                  <><Check className="mr-2 h-4 w-4 text-white" />Copied!</>
                ) : (
                  <><Copy className="mr-2 h-4 w-4" />Copy {lotSize} Lots</>
                )}
              </Button>
            </div>
          </div>

          {/* Metrics */}
          <div className="p-5 space-y-4 flex-1">
            {/* Risk / Reward row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-loss/20 bg-loss/5 p-3 space-y-0.5">
                <div className="flex items-center gap-1 text-[10px] text-foreground-muted">
                  <ShieldAlert className="h-3 w-3 text-loss" />
                  Cash at Risk
                </div>
                <div className="text-lg font-bold text-loss font-mono tabular">
                  {cashRisk.toFixed(2)} {currencySymbol}
                </div>
                <div className="text-[9px] text-foreground-subtle font-mono">
                  {effectiveRiskPercent.toFixed(2)}% of balance
                </div>
              </div>
              <div className="rounded-lg border border-profit/20 bg-profit/5 p-3 space-y-0.5">
                <div className="flex items-center gap-1 text-[10px] text-foreground-muted">
                  <TrendingUp className="h-3 w-3 text-profit" />
                  Max Reward
                </div>
                <div className="text-lg font-bold text-profit font-mono tabular">
                  {totalReward.toFixed(2)} {currencySymbol}
                </div>
                <div className="text-[9px] text-foreground-subtle font-mono">
                  1:{rrTp2.toFixed(2)} to TP2
                </div>
              </div>
            </div>

            {/* Dual TP Strategy */}
            <div className="rounded-lg border border-border bg-surface/80 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">Partial Exit Strategy</span>
                <Badge variant="outline" className="text-[9px]">50% + Runner</Badge>
              </div>

              {/* TP1 row */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-foreground-muted">
                    <span className="w-1.5 h-1.5 rounded-full bg-profit" />
                    TP1 — Close 50% @ {rrTp1.toFixed(2)}R
                  </span>
                  <button
                    onClick={() => handleCopy(tp1Lots.toString(), "tp1")}
                    className="flex items-center gap-1 font-mono font-bold text-profit hover:text-profit/80 transition-colors"
                  >
                    {copied === "tp1" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {tp1Lots} Lots
                  </button>
                </div>
                <div className="flex items-center justify-between text-[10px] text-foreground-subtle">
                  <span>Locked in</span>
                  <span className="font-mono text-profit">+{rewardTp1.toFixed(2)} {currencySymbol}</span>
                </div>
              </div>

              <div className="h-px bg-border" />

              {/* Runner row */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-foreground-muted">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Runner — Hold 50% to TP2 @ {rrTp2.toFixed(2)}R
                  </span>
                  <button
                    onClick={() => handleCopy(runnerLots.toString(), "runner")}
                    className="flex items-center gap-1 font-mono font-bold text-emerald-400 hover:text-emerald-400/80 transition-colors"
                  >
                    {copied === "runner" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {runnerLots} Lots
                  </button>
                </div>
                <div className="flex items-center justify-between text-[10px] text-foreground-subtle">
                  <span>Potential add-on</span>
                  <span className="font-mono text-emerald-400">+{rewardTp2.toFixed(2)} {currencySymbol}</span>
                </div>
              </div>

              <div className="h-px bg-border" />

              {/* Break-even SL */}
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-foreground-muted flex items-center gap-1">
                  <Target className="w-3 h-3 text-brand" />
                  Move SL to B/E after TP1:
                </span>
                <button
                  onClick={() => handleCopy(breakEvenSl.toFixed(preset.decimals), "be")}
                  className="flex items-center gap-1 font-mono font-bold text-brand hover:text-brand/80 transition-colors"
                >
                  {copied === "be" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {breakEvenSl.toFixed(preset.decimals)}
                </button>
              </div>
            </div>

            {/* Price Ladder */}
            <PriceLadder
              entry={entryPrice}
              sl={effectiveSl}
              tp1={effectiveTp1}
              tp2={effectiveTp2}
              decimals={preset.decimals}
            />
          </div>

          {/* Footer */}
          <div className="flex items-center gap-2 px-5 py-3 text-[10px] text-foreground-subtle border-t border-border bg-surface/40">
            <Info className="h-3 w-3 shrink-0 text-brand" />
            <span>
              {isCent
                ? "Cent mode: 100 USC = $1 USD. Lot values reflect cent contract sizes."
                : "Standard mode. All values in USD. Always verify with your broker."}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
