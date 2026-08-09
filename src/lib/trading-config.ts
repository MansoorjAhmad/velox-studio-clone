/** Client-side trading configuration — single source of truth for dashboard, calculator, analytics. */

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
  numberFontPreference: "sans",
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
