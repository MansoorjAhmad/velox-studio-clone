"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function getTimeEntries(): Promise<{
  data?: import("./types").TimeEntry[];
  error?: string;
}> {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "Not authenticated" };

  const { data, error } = await supabase
    .from("time_entries")
    .select("*")
    .eq("user_id", user.id)
    .order("start_time", { ascending: false })
    .limit(100);

  if (error) return { error: error.message };
  return { data: (data ?? []) as import("./types").TimeEntry[] };
}

/** Start a new timer — creates an entry with end_time = null. */
export async function startTimer(
  category: string,
  description: string,
): Promise<{ id?: string; error?: string }> {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "Not authenticated" };

  const { data, error } = await supabase
    .from("time_entries")
    .insert({
      user_id: user.id,
      category,
      description: description || null,
      start_time: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  revalidatePath("/dashboard/time");
  return { id: data.id };
}

/** Stop a running timer — set end_time. */
export async function stopTimer(id: string): Promise<{ error?: string }> {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("time_entries")
    .update({ end_time: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id)
    .is("end_time", null);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/time");
  return {};
}

export async function deleteTimeEntry(id: string): Promise<{ error?: string }> {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("time_entries")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/time");
  return {};
}
