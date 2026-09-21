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

/** Documents prêts à être utilisés dans un sélecteur (générateurs, chat). */
export async function listReadyDocuments(supabase: SupabaseClient<Database>, userId: string) {
  const { data, error } = await supabase
    .from("documents")
    .select("id, title, subject")
    .eq("user_id", userId)
    .eq("status", "ready")
    .order("created_at", { ascending: false });

  if (error) throw error;
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

/**
 * Combine le texte de plusieurs documents (ex : plusieurs chapitres d'une
 * même matière) pour un examen ou un QCM qui les couvre tous. Le budget de
 * caractères est réparti équitablement entre les documents pour qu'un gros
 * chapitre n'écrase pas les autres.
 */
export async function getDocumentsFullText(
  supabase: SupabaseClient<Database>,
  documents: { id: string; title: string }[],
  maxChars = 14000,
): Promise<string> {
  if (documents.length === 0) return "";

  const perDocBudget = Math.max(1000, Math.floor(maxChars / documents.length));
  const parts: string[] = [];

  for (const doc of documents) {
    const text = await getDocumentFullText(supabase, doc.id, perDocBudget);
    if (text) parts.push(`--- ${doc.title} ---\n${text}`);
  }

  return parts.join("\n\n");
}
