"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { TaskInput } from "./types";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function getTasks(): Promise<{
  data?: import("./types").Task[];
  error?: string;
}> {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "Not authenticated" };

  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return { error: error.message };
  return { data: (data ?? []) as import("./types").Task[] };
}

export async function createTask(input: TaskInput): Promise<{ error?: string }> {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase.from("tasks").insert({
    ...input,
    user_id: user.id,
    due_date: input.due_date ?? null,
  });

  if (error) return { error: error.message };
  revalidatePath("/dashboard/tasks");
  return {};
}

export async function updateTask(
  id: string,
  input: Partial<TaskInput>,
): Promise<{ error?: string }> {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("tasks")
    .update({
      ...input,
      due_date: input.due_date !== undefined ? (input.due_date || null) : undefined,
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/tasks");
  return {};
}

export async function updateTaskStatus(
  id: string,
  status: string,
): Promise<{ error?: string }> {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "Not authenticated" };

  const completedAt =
    status === "done" ? new Date().toISOString() : null;

  const { error } = await supabase
    .from("tasks")
    .update({
      status,
      completed_at: completedAt,
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/tasks");
  return {};
}

export async function deleteTask(id: string): Promise<{ error?: string }> {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/tasks");
  return {};
}
