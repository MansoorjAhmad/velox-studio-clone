import { createServerClient } from "@supabase/ssr";

/**
 * Server-side Supabase client.
 * Always create a new instance per request — never cache globally.
 *
 * Falls back to placeholder values so server-side prerender never crashes
 * when env vars aren't configured yet.
 */
export async function createClient() {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();

  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // setAll called from Server Component — safe to ignore.
        }
      },
    },
  });
}
