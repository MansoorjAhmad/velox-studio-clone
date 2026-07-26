import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser-side Supabase client.
 *
 * Falls back to placeholder values when env vars are missing so the app
 * never crashes during build / prerender / on a machine without .env.local.
 * Auth calls will simply fail with a clear error at runtime instead of
 * throwing during render.
 */
export function createClient() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

  return createBrowserClient(url, key);
}
