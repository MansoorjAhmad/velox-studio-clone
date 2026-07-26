"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { GoalInput } from "./types";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function getGoals(period?: "weekly" | "monthly"): Promise<{
  data?: import("./types").Goal[];
  error?: string;
}> {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "Not authenticated" };

  let q = supabase
    .from("goals")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (period) q = q.eq("period", period);

  const { data, error } = await q;
  if (error) return { error: error.message };
  return { data: (data ?? []) as import("./types").Goal[] };
}

export async function createGoal(input: GoalInput): Promise<{ error?: string }> {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("goals")
    .insert({ ...input, user_id: user.id, current_value: 0 });

  if (error) return { error: error.message };
  revalidatePath("/dashboard/goals");
  return {};
}

export async function updateProgress(
  id: string,
  currentValue: number,
): Promise<{ error?: string }> {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "Not authenticated" };

  // Fetch target to determine if completed.
  const { data: goal } = await supabase
    .from("goals")
    .select("target_value")
    .eq("id", id)
    .single();

  const target = goal?.target_value;
  const completed = target != null && currentValue >= target;

  const { error } = await supabase
    .from("goals")
    .update({
      current_value: currentValue,
      completed,
      completed_at: completed ? new Date().toISOString() : null,
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/goals");
  return {};
}

export async function toggleComplete(id: string): Promise<{ error?: string }> {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "Not authenticated" };

  const { data: goal } = await supabase
    .from("goals")
    .select("completed")
    .eq("id", id)
    .single();

  const newCompleted = !goal?.completed;

  const { error } = await supabase
    .from("goals")
    .update({
      completed: newCompleted,
      completed_at: newCompleted ? new Date().toISOString() : null,
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/goals");
  return {};
}

export async function deleteGoal(id: string): Promise<{ error?: string }> {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("goals")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/goals");
  return {};
}
