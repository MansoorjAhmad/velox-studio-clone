/** Client-side trading configuration — single source of truth for dashboard, calculator, analytics. */

import { createClient } from "@/lib/supabase/client";

export type NumberFontPreference = "sans" | "mono" | "serif";

export interface TradingConfig {
  monthlyProfitTarget: number;
  dailyRiskLimitPct: number;
  phaseRiskPct: number;
  topgPhase: string;
  numberFontPreference: NumberFontPreference;
}

export const DEFAULT_TRADING_CONFIG: TradingConfig = {
  monthlyProfitTarget: 5000,
  dailyRiskLimitPct: 3.0,
  phaseRiskPct: 1.0,
  topgPhase: "ICT Silver Bullet",
  numberFontPreference: "serif",
};

const STORAGE_KEY = "velox_trading_config";

export function getTradingConfig(): TradingConfig {
  if (typeof window === "undefined") return DEFAULT_TRADING_CONFIG;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_TRADING_CONFIG;
    return { ...DEFAULT_TRADING_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_TRADING_CONFIG;
  }
}

export function saveTradingConfig(config: Partial<TradingConfig>): TradingConfig {
  const merged = { ...getTradingConfig(), ...config };
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    window.dispatchEvent(new CustomEvent("trading_config_changed"));
  }
  return merged;
}

export function useTradingConfigListener(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  const handler = () => callback();
  window.addEventListener("trading_config_changed", handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener("trading_config_changed", handler);
    window.removeEventListener("storage", handler);
  };
}

/** Refresh the synchronous local cache from the signed-in user's config. */
export async function syncTradingConfigFromServer(): Promise<TradingConfig> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return getTradingConfig();
  const { data, error } = await supabase.from("trading_config").select("*").eq("user_id", user.id).maybeSingle();
  if (error || !data) return getTradingConfig();
  const synced: TradingConfig = {
    monthlyProfitTarget: Number(data.monthly_profit_target),
    dailyRiskLimitPct: Number(data.daily_risk_limit_pct),
    phaseRiskPct: Number(data.phase_risk_pct),
    topgPhase: data.topg_phase,
    numberFontPreference: data.number_font_preference as NumberFontPreference,
  };
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(synced));
    window.dispatchEvent(new CustomEvent("trading_config_changed"));
  }
  return synced;
}

/** Save immediately locally, then mirror the complete config to Supabase. */
export async function saveTradingConfigSynced(config: Partial<TradingConfig>): Promise<TradingConfig> {
  const merged = saveTradingConfig(config);
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return merged;
  await supabase.from("trading_config").upsert({
    user_id: user.id,
    monthly_profit_target: merged.monthlyProfitTarget,
    daily_risk_limit_pct: merged.dailyRiskLimitPct,
    phase_risk_pct: merged.phaseRiskPct,
    topg_phase: merged.topgPhase,
    number_font_preference: merged.numberFontPreference,
  });
  return merged;
}
