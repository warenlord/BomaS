import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";
import { createClient } from "@/lib/supabase/server";

export async function createConversation(
  supabase: SupabaseClient<Database>,
  userId: string,
  documentId?: string,
  title?: string,
) {
  const { data, error } = await supabase
    .from("conversations")
    .insert({
      user_id: userId,
      document_id: documentId ?? null,
      title: title ?? "Nouvelle conversation",
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function listConversations(supabase: SupabaseClient<Database>, userId: string) {
  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * Variante mémorisée par requête : le layout (sidebar) et la page /chat
 * demandent tous deux la liste des conversations pour la même requête.
 */
export const getCachedConversations = cache(async (userId: string) => {
  const supabase = await createClient();
  return listConversations(supabase, userId);
});

export async function getConversation(supabase: SupabaseClient<Database>, conversationId: string) {
  const { data, error } = await supabase.from("conversations").select("*").eq("id", conversationId).single();
  if (error) return null;
  return data;
}

export async function getConversationMessages(supabase: SupabaseClient<Database>, conversationId: string) {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data;
}

/** Renomme automatiquement une conversation à partir du premier message utilisateur. */
export async function maybeRenameConversation(
  supabase: SupabaseClient<Database>,
  conversationId: string,
  firstUserMessage: string,
) {
  const title = firstUserMessage.trim().slice(0, 60) || "Nouvelle conversation";
  await supabase.from("conversations").update({ title }).eq("id", conversationId);
}
