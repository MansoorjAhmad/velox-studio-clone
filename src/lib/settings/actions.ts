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
