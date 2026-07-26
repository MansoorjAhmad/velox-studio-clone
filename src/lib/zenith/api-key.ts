"use client";

/**
 * Manages the Gemini API key in the browser's localStorage.
 *
 * Why localStorage instead of .env.local?
 * - Beginners don't need to edit files or restart servers
 * - Key persists across sessions on this device
 * - Can be updated anytime from Settings
 * - Falls back to .env.local if set there (for advanced users)
 *
 * Note: localStorage is browser-specific. The key won't sync across
 * devices. For a personal-use app on one computer, this is perfect.
 */

const STORAGE_KEY = "velox_gemini_api_key";

/** Get the stored API key (from localStorage, then env var fallback). */
export function getApiKey(): string | null {
  // Check localStorage first (user-entered via Settings)
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && stored.trim()) return stored.trim();
  }
  // Fall back to env var (for advanced users who set .env.local)
  const env = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (env && env !== "placeholder-gemini-key") return env;
  return null;
}

/** Save the API key to localStorage. */
export function setApiKey(key: string): void {
  if (typeof window === "undefined") return;
  if (key.trim()) {
    localStorage.setItem(STORAGE_KEY, key.trim());
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

/** Remove the stored API key. */
export function clearApiKey(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

/** Check if any API key is available. */
export function hasApiKey(): boolean {
  return getApiKey() !== null;
}
