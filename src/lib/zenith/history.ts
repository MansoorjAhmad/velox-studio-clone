import { createClient } from "@/lib/supabase/client";

export interface StoredMessage { id: string; role: "user" | "agent"; text: string; }

export async function loadZenithHistory(): Promise<StoredMessage[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase.from("zenith_messages").select("id, role, text").eq("user_id", user.id).order("created_at", { ascending: true });
  return error || !data ? [] : data as StoredMessage[];
}

export async function saveZenithMessage(role: "user" | "agent", text: string): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("zenith_messages").insert({ user_id: user.id, role, text });
}

export async function clearZenithHistory(): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("zenith_messages").delete().eq("user_id", user.id);
}
