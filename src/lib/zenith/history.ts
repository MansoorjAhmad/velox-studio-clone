import { createClient } from "@/lib/supabase/client";

export interface StoredMessage {
  id: string;
  role: "user" | "agent";
  text: string;
}

export interface Conversation {
  id: string;
  title: string;
  updated_at: string;
}

/** Lists the signed-in user's conversations, newest first. */
export async function listConversations(): Promise<Conversation[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("zenith_conversations")
    .select("id, title, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  return error || !data ? [] : (data as Conversation[]);
}

/** Creates an empty Zenith conversation. */
export async function createConversation(): Promise<string | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("zenith_conversations")
    .insert({ user_id: user.id, title: "New chat" })
    .select("id")
    .single();

  return error || !data ? null : data.id;
}

/** Loads the messages belonging only to one conversation. */
export async function loadConversationMessages(
  conversationId: string,
): Promise<StoredMessage[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("zenith_messages")
    .select("id, role, text")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  return error || !data ? [] : (data as StoredMessage[]);
}

/** Saves a message and keeps its conversation at the top of the history. */
export async function saveMessageToConversation(
  conversationId: string,
  role: "user" | "agent",
  text: string,
): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase.from("zenith_messages").insert({
    user_id: user.id,
    conversation_id: conversationId,
    role,
    text,
  });
  if (error) return;

  const { data: conversation } = await supabase
    .from("zenith_conversations")
    .select("title")
    .eq("id", conversationId)
    .single();

  const title = role === "user" && conversation?.title === "New chat"
    ? `${text.slice(0, 50)}${text.length > 50 ? "…" : ""}`
    : undefined;

  await supabase
    .from("zenith_conversations")
    .update(title ? { title } : { updated_at: new Date().toISOString() })
    .eq("id", conversationId);
}

/** Deletes a conversation and, through the database cascade, its messages. */
export async function deleteConversation(conversationId: string): Promise<void> {
  const supabase = createClient();
  await supabase.from("zenith_conversations").delete().eq("id", conversationId);
}
