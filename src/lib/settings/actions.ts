"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface Profile {
  id: string;
  username: string | null;
  display_name: string | null;
  account_type: string | null;
  base_currency: string | null;
}

export async function getProfile(): Promise<{
  data?: Profile;
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // PGRST116 = no row found. Not an error — return empty profile.
  if (error) {
    if (error.code === "PGRST116") return { data: undefined };
    return { error: error.message };
  }
  return { data: data as Profile };
}

export async function upsertProfile(input: {
  display_name: string | null;
  account_type: string;
  base_currency: string;
}): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      display_name: input.display_name || null,
      account_type: input.account_type,
      base_currency: input.base_currency,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  if (error) return { error: error.message };
  revalidatePath("/dashboard/settings");
  return {};
}

export async function resetAllUserData(): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Delete user records from all Supabase tables
  await supabase.from("routine_logs").delete().eq("user_id", user.id);
  await supabase.from("zenith_messages").delete().eq("user_id", user.id);
  await supabase.from("backtest_trades").delete().eq("user_id", user.id);
  await supabase.from("user_strategies").delete().eq("user_id", user.id);
  await supabase.from("user_master_plan").delete().eq("user_id", user.id);
  await supabase.from("weekly_review_cache").delete().eq("user_id", user.id);
  await supabase.from("trading_config").delete().eq("user_id", user.id);
  await supabase.from("user_preferences").delete().eq("user_id", user.id);
  await supabase.from("routine_items").delete().eq("user_id", user.id);
  await supabase.from("trades").delete().eq("user_id", user.id);
  await supabase.from("goals").delete().eq("user_id", user.id);
  await supabase.from("tasks").delete().eq("user_id", user.id);
  await supabase.from("transactions").delete().eq("user_id", user.id);
  await supabase.from("debt_payments").delete().eq("user_id", user.id);
  await supabase.from("debts").delete().eq("user_id", user.id);
  await supabase.from("trading_accounts").delete().eq("user_id", user.id);
  await supabase.from("time_entries").delete().eq("user_id", user.id);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/routine");
  revalidatePath("/dashboard/routine-analytics");
  revalidatePath("/dashboard/journal");
  revalidatePath("/dashboard/goals");
  revalidatePath("/dashboard/goals-analytics");
  revalidatePath("/dashboard/tasks");
  revalidatePath("/dashboard/finances");
  revalidatePath("/dashboard/finances-analytics");
  revalidatePath("/dashboard/debts");
  revalidatePath("/dashboard/settings");

  return {};
}
