"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Calculator,
  TrendingUp,
  TrendingDown,
  Coins,
  Sliders,
  Target,
  DollarSign,
  Shield,
  Zap,
  BarChart3,
  Crosshair,
  Split,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { getTradingConfig } from "@/lib/trading-config";

interface InstrumentConfig {
  symbol: string;
  name: string;
  pipSize: number;
  contractSize: number;
  defaultPrice: number;
  defaultSlPips: number;
  defaultTpPips: number;
}

const INSTRUMENTS: InstrumentConfig[] = [
  { symbol: "XAUUSD", name: "Gold (XAUUSD)", pipSize: 0.1, contractSize: 100, defaultPrice: 2400.0, defaultSlPips: 30, defaultTpPips: 60 },
  { symbol: "NAS100", name: "NAS100 / US100", pipSize: 1.0, contractSize: 1, defaultPrice: 19800.0, defaultSlPips: 25, defaultTpPips: 75 },
  { symbol: "EURUSD", name: "EUR/USD", pipSize: 0.0001, contractSize: 100000, defaultPrice: 1.0850, defaultSlPips: 15, defaultTpPips: 45 },
  { symbol: "GBPUSD", name: "GBP/USD", pipSize: 0.0001, contractSize: 100000, defaultPrice: 1.2850, defaultSlPips: 20, defaultTpPips: 60 },
  { symbol: "USDJPY", name: "USD/JPY", pipSize: 0.01, contractSize: 100000, defaultPrice: 155.50, defaultSlPips: 20, defaultTpPips: 60 },
  { symbol: "US30", name: "US30 / Dow Jones", pipSize: 1.0, contractSize: 1, defaultPrice: 40500.0, defaultSlPips: 40, defaultTpPips: 120 },
  { symbol: "CUSTOM", name: "Custom Instrument", pipSize: 0.01, contractSize: 1, defaultPrice: 100.0, defaultSlPips: 20, defaultTpPips: 40 },
];

const RISK_PRESETS = [0.25, 0.5, 1.0, 1.5, 2.0];

export function PositionCalculator() {
  const [direction, setDirection] = useState<"LONG" | "SHORT">("LONG");
  const [calcMode, setCalcMode] = useState<"pips" | "price">("pips");
  const [selectedSymbol, setSelectedSymbol] = useState<string>("XAUUSD");
  const [accountType, setAccountType] = useState<"standard" | "cent">("standard");
  const [accountBalance, setAccountBalance] = useState<string>("10000");
  const [riskPercentStr, setRiskPercentStr] = useState<string>("1.0");
  const [riskAmountStr, setRiskAmountStr] = useState<string>("100");
  const [entryPriceStr, setEntryPriceStr] = useState<string>("2400.00");
  const [stopLossPriceStr, setStopLossPriceStr] = useState<string>("2397.00");
  const [exitPriceStr, setExitPriceStr] = useState<string>("2406.00");
  const [slPipsStr, setSlPipsStr] = useState<string>("30");
  const [tpPipsStr, setTpPipsStr] = useState<string>("60");
  const [tp2PipsStr, setTp2PipsStr] = useState<string>("120");
  const [dualTpEnabled, setDualTpEnabled] = useState(false);
  const [closeAtTp1Pct, setCloseAtTp1Pct] = useState<string>("50");
  const [beBufferPips, setBeBufferPips] = useState<string>("2");
  const [customSymbol, setCustomSymbol] = useState("CUSTOM");
  const [customPipSize, setCustomPipSize] = useState("0.01");
  const [customPipValue, setCustomPipValue] = useState("1");

  useEffect(() => {
    const config = getTradingConfig();
    setRiskPercentStr(String(config.phaseRiskPct));
    const bal = parseFloat(accountBalance) || 10000;
    setRiskAmountStr(((bal * config.phaseRiskPct) / 100).toFixed(2));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const instrument = useMemo(() => {
    if (selectedSymbol !== "CUSTOM") return INSTRUMENTS.find((i) => i.symbol === selectedSymbol) ?? INSTRUMENTS[0];
    return {
      ...INSTRUMENTS.find((i) => i.symbol === "CUSTOM")!,
      symbol: customSymbol || "CUSTOM",
      name: `${customSymbol || "CUSTOM"} (Custom)`,
      pipSize: Number(customPipSize) || 0.01,
    };
  }, [selectedSymbol, customSymbol, customPipSize]);

  const priceDecimals = instrument.pipSize < 0.01 ? 5 : instrument.pipSize < 1 ? 2 : 1;

  const handleInstrumentChange = (symbol: string) => {
    setSelectedSymbol(symbol);
    const inst = INSTRUMENTS.find((i) => i.symbol === symbol) ?? INSTRUMENTS[0];
    setEntryPriceStr(inst.defaultPrice.toString());
    setSlPipsStr(inst.defaultSlPips.toString());
    setTpPipsStr(inst.defaultTpPips.toString());
    setTp2PipsStr(String(inst.defaultTpPips * 2));
    const slDist = inst.defaultSlPips * inst.pipSize;
    const tpDist = inst.defaultTpPips * inst.pipSize;
    setStopLossPriceStr((direction === "LONG" ? inst.defaultPrice - slDist : inst.defaultPrice + slDist).toFixed(priceDecimals));
    setExitPriceStr((direction === "LONG" ? inst.defaultPrice + tpDist : inst.defaultPrice - tpDist).toFixed(priceDecimals));
  };

  const handleRiskPercentChange = (val: string) => {
    setRiskPercentStr(val);
    const pct = parseFloat(val) || 0;
    const bal = parseFloat(accountBalance) || 0;
    if (bal > 0) setRiskAmountStr(((bal * pct) / 100).toFixed(2));
  };

  const handleRiskAmountChange = (val: string) => {
    setRiskAmountStr(val);
    const amt = parseFloat(val) || 0;
    const bal = parseFloat(accountBalance) || 0;
    if (bal > 0) setRiskPercentStr(((amt / bal) * 100).toFixed(2));
  };

  const handleBalanceChange = (val: string) => {
    setAccountBalance(val);
    const bal = parseFloat(val) || 0;
    const pct = parseFloat(riskPercentStr) || 0;
    if (bal > 0) setRiskAmountStr(((bal * pct) / 100).toFixed(2));
  };

  const applyRiskPreset = (pct: number) => {
    handleRiskPercentChange(String(pct));
  };

  const applyBreakEven = () => {
    const entry = parseFloat(entryPriceStr) || 0;
    const buffer = (parseFloat(beBufferPips) || 0) * instrument.pipSize;
    const bePrice = direction === "LONG" ? entry + buffer : entry - buffer;
    if (calcMode === "pips") {
      setSlPipsStr(String(parseFloat(beBufferPips) || 0));
    } else {
      setStopLossPriceStr(bePrice.toFixed(priceDecimals));
    }
  };

  const calculation = useMemo(() => {
    const balance = parseFloat(accountBalance) || 0;
    const entry = parseFloat(entryPriceStr) || 0;
    const explicitRisk = parseFloat(riskAmountStr) || 0;
    if (balance <= 0 || entry <= 0) return null;

    const riskAmount = explicitRisk > 0 ? explicitRisk : (balance * (parseFloat(riskPercentStr) || 1)) / 100;

    let slPips = 0;
    let tpPips = 0;
    let tp2Pips = 0;
    let computedSlPrice = 0;
    let computedTpPrice = 0;
    let computedTp2Price = 0;

    if (calcMode === "pips") {
      slPips = parseFloat(slPipsStr) || 0;
      tpPips = parseFloat(tpPipsStr) || 0;
      tp2Pips = parseFloat(tp2PipsStr) || 0;
      const slDist = slPips * instrument.pipSize;
      const tpDist = tpPips * instrument.pipSize;
      const tp2Dist = tp2Pips * instrument.pipSize;
      computedSlPrice = direction === "LONG" ? entry - slDist : entry + slDist;
      computedTpPrice = direction === "LONG" ? entry + tpDist : entry - tpDist;
      computedTp2Price = direction === "LONG" ? entry + tp2Dist : entry - tp2Dist;
    } else {
      const slPrice = parseFloat(stopLossPriceStr) || 0;
      const tpPrice = parseFloat(exitPriceStr) || 0;
      computedSlPrice = slPrice;
      computedTpPrice = tpPrice;
      slPips = Math.round((Math.abs(entry - slPrice) / instrument.pipSize) * 10) / 10;
      tpPips = Math.round((Math.abs(tpPrice - entry) / instrument.pipSize) * 10) / 10;
      if (dualTpEnabled) {
        tp2Pips = tpPips * 2;
        computedTp2Price = direction === "LONG" ? entry + tp2Pips * instrument.pipSize : entry - tp2Pips * instrument.pipSize;
      }
    }

    if (slPips <= 0) return null;

    let pipValuePerLot = 10;
    if (instrument.symbol === "NAS100" || instrument.symbol === "US30") pipValuePerLot = 1;
    if (instrument.symbol === "USDJPY") pipValuePerLot = 1000 / entry;
    if (selectedSymbol === "CUSTOM") pipValuePerLot = Number(customPipValue) || 1;
    let rawLots = riskAmount / (slPips * pipValuePerLot);

    if (accountType === "cent") rawLots = rawLots * 100;

    const recommendedLots = Math.max(0.01, Math.floor(rawLots * 100) / 100);
    const fullReward = tpPips > 0 ? riskAmount * (tpPips / slPips) : 0;

    let rewardAmount = fullReward;
    let runnerReward = 0;
    const closePct = dualTpEnabled ? (parseFloat(closeAtTp1Pct) || 50) / 100 : 1;
    if (dualTpEnabled && tp2Pips > 0) {
      rewardAmount = fullReward * closePct;
      runnerReward = riskAmount * (tp2Pips / slPips) * (1 - closePct);
    }

    const rrRatio = Math.round((tpPips / slPips) * 10) / 10;
    const rr2Ratio = tp2Pips > 0 ? Math.round((tp2Pips / slPips) * 10) / 10 : 0;

    return {
      riskAmount: Math.round(riskAmount * 100) / 100,
      rewardAmount: Math.round(rewardAmount * 100) / 100,
      runnerReward: Math.round(runnerReward * 100) / 100,
      totalReward: Math.round((rewardAmount + runnerReward) * 100) / 100,
      recommendedLots,
      slPips,
      tpPips,
      tp2Pips,
      slPrice: parseFloat(computedSlPrice.toFixed(priceDecimals)),
      tpPrice: parseFloat(computedTpPrice.toFixed(priceDecimals)),
      tp2Price: parseFloat(computedTp2Price.toFixed(priceDecimals)),
      rrRatio,
      rr2Ratio,
      pipValue: Math.round(pipValuePerLot * recommendedLots * 100) / 100,
      closePct,
    };
  }, [
    direction, calcMode, selectedSymbol, accountType, accountBalance,
    riskPercentStr, riskAmountStr, entryPriceStr, stopLossPriceStr, exitPriceStr,
    slPipsStr, tpPipsStr, tp2PipsStr, dualTpEnabled, closeAtTp1Pct, instrument, priceDecimals, customPipValue, selectedSymbol,
  ]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Controls bar */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        <div className="md:col-span-4 flex items-center rounded-lg border border-border bg-surface p-0.5">
          <button
            type="button"
            onClick={() => setCalcMode("pips")}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold rounded-md transition-all",
              calcMode === "pips" ? "bg-brand text-white shadow-md shadow-brand/20" : "text-foreground-muted hover:text-foreground",
            )}
          >
            <Sliders className="w-3.5 h-3.5" />
            Pip / Point Mode
          </button>
          <button
            type="button"
            onClick={() => setCalcMode("price")}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold rounded-md transition-all",
              calcMode === "price" ? "bg-brand text-white shadow-md shadow-brand/20" : "text-foreground-muted hover:text-foreground",
            )}
          >
            <Target className="w-3.5 h-3.5" />
            Price Level Mode
          </button>
        </div>

        <div className="md:col-span-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setDirection("LONG")}
            className={cn(
              "flex items-center justify-center gap-2 rounded-lg border py-2.5 text-xs font-bold transition-all",
              direction === "LONG"
                ? "border-profit bg-profit/12 text-profit shadow-sm shadow-profit/10"
                : "border-border bg-surface text-foreground-muted hover:border-border-strong",
            )}
          >
            <TrendingUp className="w-4 h-4" />
            LONG (BUY)
          </button>
          <button
            type="button"
            onClick={() => setDirection("SHORT")}
            className={cn(
              "flex items-center justify-center gap-2 rounded-lg border py-2.5 text-xs font-bold transition-all",
              direction === "SHORT"
                ? "border-loss bg-loss/12 text-loss shadow-sm shadow-loss/10"
                : "border-border bg-surface text-foreground-muted hover:border-border-strong",
            )}
          >
            <TrendingDown className="w-4 h-4" />
            SHORT (SELL)
          </button>
        </div>

        <div className="md:col-span-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setAccountType(accountType === "standard" ? "cent" : "standard")}
            className="rounded-lg border border-border bg-surface px-3 py-2.5 text-xs font-bold text-foreground flex items-center justify-center gap-1.5 hover:border-brand/50 transition-all"
          >
            <Coins className="w-3.5 h-3.5 text-brand" />
            {accountType === "standard" ? "Standard (USD)" : "Cent (USC)"}
          </button>
          <select
            value={selectedSymbol}
            onChange={(e) => handleInstrumentChange(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-xs font-bold text-foreground outline-none focus:border-brand transition-colors cursor-pointer"
          >
            {INSTRUMENTS.map((inst) => (
              <option key={inst.symbol} value={inst.symbol}>{inst.symbol}</option>
            ))}
          </select>
        </div>
      </div>

      {selectedSymbol === "CUSTOM" && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-xl border border-brand/25 bg-brand/5 p-3 animate-fade-in">
          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-brand">Custom Symbol</Label>
            <Input value={customSymbol} onChange={(e) => setCustomSymbol(e.target.value.toUpperCase())} className="font-mono text-xs font-bold" placeholder="e.g. BTCUSD" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-brand">Tick / Pip Size</Label>
            <Input type="number" min="0.00001" step="0.00001" value={customPipSize} onChange={(e) => setCustomPipSize(e.target.value)} className="font-mono text-xs" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-brand">$ per Pip / Lot</Label>
            <Input type="number" min="0.01" step="0.01" value={customPipValue} onChange={(e) => setCustomPipValue(e.target.value)} className="font-mono text-xs" />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Inputs */}
        <Card className="md:col-span-7 card-hover">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Calculator className="w-4 h-4 text-brand" />
              {calcMode === "pips" ? "Pip-Based Risk Parameters" : "Price-Based Risk Parameters"}
            </CardTitle>
            <CardDescription>Type your personal risk per trade — $ amount or % of balance.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-foreground-subtle">
                Account Balance ({accountType === "cent" ? "USC" : "USD"})
              </Label>
              <Input type="number" value={accountBalance} onChange={(e) => handleBalanceChange(e.target.value)} className="font-mono text-sm font-bold" />
            </div>

            {/* Manual risk — highlighted */}
            <div className="p-3 rounded-xl border border-brand/25 bg-brand/5 space-y-3">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-brand" />
                <span className="text-xs font-bold text-brand uppercase tracking-wider">Manual Risk Per Trade</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-foreground-subtle">Risk Amount ($)</Label>
                  <Input
                    type="number"
                    step="1"
                    value={riskAmountStr}
                    onChange={(e) => handleRiskAmountChange(e.target.value)}
                    className="font-mono text-sm font-extrabold text-loss border-loss/40 focus:border-loss"
                    placeholder="e.g. 100"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-foreground-subtle">Risk Percentage (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={riskPercentStr}
                    onChange={(e) => handleRiskPercentChange(e.target.value)}
                    className="font-mono text-sm font-extrabold text-brand border-brand/40 focus:border-brand"
                    placeholder="e.g. 1.0"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {RISK_PRESETS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => applyRiskPreset(p)}
                    className={cn(
                      "px-2.5 py-1 rounded-md text-[10px] font-bold border transition-all",
                      parseFloat(riskPercentStr) === p
                        ? "bg-brand text-white border-brand"
                        : "border-border bg-surface hover:border-brand/50 text-foreground-muted",
                    )}
                  >
                    {p}%
                  </button>
                ))}
              </div>
            </div>

            {/* Entry + SL/TP */}
            {calcMode === "pips" ? (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-foreground-subtle">Entry Price</Label>
                    <Input type="number" step="0.01" value={entryPriceStr} onChange={(e) => setEntryPriceStr(e.target.value)} className="font-mono text-xs font-bold" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-loss">SL (Pips/Pts)</Label>
                    <Input type="number" value={slPipsStr} onChange={(e) => setSlPipsStr(e.target.value)} className="font-mono text-xs text-loss font-bold border-loss/30" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-profit">TP1 (Pips/Pts)</Label>
                    <Input type="number" value={tpPipsStr} onChange={(e) => setTpPipsStr(e.target.value)} className="font-mono text-xs text-profit font-bold border-profit/30" />
                  </div>
                </div>
                {dualTpEnabled && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">TP2 Runner (Pips)</Label>
                      <Input type="number" value={tp2PipsStr} onChange={(e) => setTp2PipsStr(e.target.value)} className="font-mono text-xs text-emerald-400 font-bold border-emerald-400/30" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold uppercase tracking-wider text-foreground-subtle">Close at TP1 (%)</Label>
                      <Input type="number" value={closeAtTp1Pct} onChange={(e) => setCloseAtTp1Pct(e.target.value)} className="font-mono text-xs" />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-foreground-subtle">Entry Price</Label>
                  <Input type="number" step="0.01" value={entryPriceStr} onChange={(e) => setEntryPriceStr(e.target.value)} className="font-mono text-xs font-bold" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-loss">Stop Loss Price</Label>
                  <Input type="number" step="0.01" value={stopLossPriceStr} onChange={(e) => setStopLossPriceStr(e.target.value)} className="font-mono text-xs text-loss border-loss/30" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-profit">Exit / TP Price</Label>
                  <Input type="number" step="0.01" value={exitPriceStr} onChange={(e) => setExitPriceStr(e.target.value)} className="font-mono text-xs text-profit border-profit/30" />
                </div>
              </div>
            )}

            {/* Tools row */}
            <div className="flex flex-wrap gap-2 pt-1">
              <Button type="button" size="sm" variant="outline" className="text-[10px] gap-1.5 h-8" onClick={applyBreakEven}>
                <Crosshair className="w-3 h-3" />
                Break-Even SL
              </Button>
              <div className="flex items-center gap-1.5">
                <Input
                  type="number"
                  value={beBufferPips}
                  onChange={(e) => setBeBufferPips(e.target.value)}
                  className="w-16 h-8 font-mono text-[10px]"
                  title="BE buffer pips"
                />
                <span className="text-[10px] text-foreground-subtle">pips buffer</span>
              </div>
              <Button
                type="button"
                size="sm"
                variant={dualTpEnabled ? "primary" : "outline"}
                className={cn("text-[10px] gap-1.5 h-8", dualTpEnabled && "bg-brand text-white")}
                onClick={() => setDualTpEnabled((v) => !v)}
              >
                <Split className="w-3 h-3" />
                Dual TP (50% + Runner)
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Output */}
        <Card className="md:col-span-5 border-brand/20 bg-gradient-to-br from-brand/8 via-surface to-surface-2 flex flex-col card-hover">
          <CardHeader className="pb-2">
            <Badge variant="brand" className="w-fit mb-1 text-[10px] uppercase tracking-wider">Recommended Lot Size</Badge>
            <CardTitle className="text-4xl font-extrabold font-mono text-brand tracking-tight tabular">
              {calculation ? `${calculation.recommendedLots}` : "0.00"}
              <span className="text-lg font-bold text-foreground-muted ml-1.5">Lots</span>
            </CardTitle>
            <CardDescription>{accountType === "cent" ? "Cent Account (USC)" : "Standard Lot"} — {instrument.name}</CardDescription>
          </CardHeader>

          {calculation && (
            <CardContent className="space-y-3 pt-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-surface/60 p-3 border border-loss/20">
                  <p className="text-[9px] text-foreground-subtle uppercase tracking-wider font-bold">Risk ($)</p>
                  <p className="font-mono font-extrabold text-loss text-lg tabular">-{formatCurrency(calculation.riskAmount)}</p>
                </div>
                <div className="rounded-lg bg-surface/60 p-3 border border-profit/20">
                  <p className="text-[9px] text-foreground-subtle uppercase tracking-wider font-bold">
                    {dualTpEnabled ? `TP1 Reward (${(calculation.closePct * 100).toFixed(0)}%)` : "Reward ($)"}
                  </p>
                  <p className="font-mono font-extrabold text-profit text-lg tabular">+{formatCurrency(calculation.rewardAmount)}</p>
                </div>
              </div>

              {dualTpEnabled && calculation.runnerReward > 0 && (
                <div className="rounded-lg bg-surface/60 p-3 border border-emerald-400/20">
                  <p className="text-[9px] text-foreground-subtle uppercase tracking-wider font-bold">Runner Reward (remaining %)</p>
                  <p className="font-mono font-extrabold text-emerald-400 text-lg tabular">+{formatCurrency(calculation.runnerReward)}</p>
                  <p className="text-[9px] text-foreground-muted mt-1">Total if both TPs hit: +{formatCurrency(calculation.totalReward)}</p>
                </div>
              )}

              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-bold">
                  <span className="text-loss">Risk</span>
                  <span className="text-brand font-mono">1 : {calculation.rrRatio} R{dualTpEnabled && calculation.rr2Ratio > 0 ? ` → 1 : ${calculation.rr2Ratio} R runner` : ""}</span>
                  <span className="text-profit">Reward</span>
                </div>
                <div className="h-3 rounded-full overflow-hidden flex">
                  <div className="bg-loss/60" style={{ width: `${(1 / (1 + calculation.rrRatio)) * 100}%` }} />
                  <div className="bg-profit/60" style={{ width: `${(calculation.rrRatio / (1 + calculation.rrRatio)) * 100}%` }} />
                </div>
              </div>

              <div className="rounded-lg bg-surface/60 p-3 border border-border text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-foreground-subtle">SL Level</span>
                  <span className="font-mono font-bold text-loss">{calculation.slPrice} ({calculation.slPips} pips)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground-subtle">TP1 Level</span>
                  <span className="font-mono font-bold text-profit">{calculation.tpPrice} ({calculation.tpPips} pips)</span>
                </div>
                {dualTpEnabled && calculation.tp2Pips > 0 && (
                  <div className="flex justify-between">
                    <span className="text-foreground-subtle">TP2 Runner</span>
                    <span className="font-mono font-bold text-emerald-400">{calculation.tp2Price} ({calculation.tp2Pips} pips)</span>
                  </div>
                )}
              </div>
            </CardContent>
          )}
        </Card>
      </div>

      {calculation && (
        <Card className="bg-gradient-to-r from-surface via-surface-2 to-surface card-hover">
          <CardContent className="p-3">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { label: "Lot Size", value: `${calculation.recommendedLots}`, icon: BarChart3, color: "text-brand" },
                { label: "Risk Amount", value: `-${formatCurrency(calculation.riskAmount)}`, icon: Shield, color: "text-loss" },
                { label: dualTpEnabled ? "Total Reward" : "Reward", value: `+${formatCurrency(dualTpEnabled ? calculation.totalReward : calculation.rewardAmount)}`, icon: Zap, color: "text-profit" },
                { label: "R:R Ratio", value: `1 : ${calculation.rrRatio}`, icon: Target, color: "text-brand" },
                { label: "Pip Value", value: `$${calculation.pipValue} / pip`, icon: DollarSign, color: "text-foreground" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2.5 p-2 rounded-lg border border-border/50 bg-surface/40">
                  <div className="w-8 h-8 rounded-md bg-surface-2 flex items-center justify-center shrink-0">
                    <item.icon className="w-3.5 h-3.5 text-foreground-subtle" />
                  </div>
                  <div>
                    <p className="text-[9px] text-foreground-subtle uppercase tracking-wider font-bold">{item.label}</p>
                    <p className={cn("font-mono font-bold text-sm tabular", item.color)}>{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
