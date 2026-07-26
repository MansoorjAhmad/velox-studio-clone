"use server";

import { createClient } from "@/lib/supabase/server";
import type { Trade } from "@/lib/journal/types";

export interface ZenithData {
  trades: Trade[];
  error?: string;
}

export async function getZenithData(): Promise<ZenithData> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { trades: [], error: "Not authenticated" };

  const { data, error } = await supabase
    .from("trades")
    .select("*")
    .eq("user_id", user.id)
    .order("entry_time", { ascending: false });

  if (error) return { trades: [], error: error.message };
  return { trades: (data ?? []) as Trade[] };
}
