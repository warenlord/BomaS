import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";

export async function listDocuments(supabase: SupabaseClient<Database>, userId: string) {
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function getDocument(supabase: SupabaseClient<Database>, documentId: string) {
  const { data, error } = await supabase.from("documents").select("*").eq("id", documentId).single();
  if (error) return null;
  return data;
}

export async function countReadyDocuments(supabase: SupabaseClient<Database>, userId: string) {
  const { count, error } = await supabase
    .from("documents")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .neq("status", "error");

  if (error) throw error;
  return count ?? 0;
}

/**
 * Concatène les chunks d'un document (dans l'ordre) pour fournir un contexte
 * complet aux générateurs (résumé, QCM, examen, ...), plafonné en caractères
 * pour garder des prompts raisonnables.
 */
export async function getDocumentFullText(
  supabase: SupabaseClient<Database>,
  documentId: string,
  maxChars = 14000,
): Promise<string> {
  const { data, error } = await supabase
    .from("document_chunks")
    .select("content, chunk_index")
    .eq("document_id", documentId)
    .order("chunk_index", { ascending: true });

  if (error) throw error;

  let text = "";
  for (const chunk of data ?? []) {
    if (text.length >= maxChars) break;
    text += (text ? "\n\n" : "") + chunk.content;
  }

  return text.slice(0, maxChars);
}
