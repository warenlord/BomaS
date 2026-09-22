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
      document_ids: documentId ? [documentId] : [],
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

/**
 * Résout une discussion comme source potentielle pour un générateur (utilisé
 * par les pages /tools/* quand on y arrive depuis le menu "Créer avec cette
 * discussion" du chat), avec vérification de propriété. Retourne `null` si
 * l'id est absent, introuvable, ou n'appartient pas à l'utilisateur.
 */
export async function getConversationSource(
  supabase: SupabaseClient<Database>,
  userId: string,
  conversationId?: string,
): Promise<{ id: string; title: string } | null> {
  if (!conversationId) return null;
  const conversation = await getConversation(supabase, conversationId);
  if (!conversation || conversation.user_id !== userId) return null;
  return { id: conversation.id, title: conversation.title };
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

/**
 * Transcrit une discussion en texte utilisable comme source pour les
 * générateurs (QCM, fiche, etc.). Si la discussion dépasse le budget de
 * caractères, on garde les messages les plus RÉCENTS plutôt que le début :
 * ce qui vient d'être discuté est généralement plus pertinent à réviser que
 * les tout premiers échanges d'une longue conversation.
 */
export async function getConversationText(
  supabase: SupabaseClient<Database>,
  conversationId: string,
  maxChars = 14000,
): Promise<string> {
  const messages = await getConversationMessages(supabase, conversationId);

  const lines: string[] = [];
  let total = 0;
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    const label = m.role === "user" ? "Étudiant" : "Assistant";
    const line = `${label} : ${m.content}`;
    if (total + line.length > maxChars) break;
    lines.unshift(line);
    total += line.length;
  }

  return lines.join("\n\n");
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
