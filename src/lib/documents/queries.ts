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

/**
 * Récupère un sous-ensemble précis de documents appartenant à l'utilisateur,
 * pour valider une sélection (ex: documentIds envoyés par un générateur) sans
 * charger toute sa bibliothèque pour ensuite filtrer côté serveur.
 */
export async function getDocumentsByIds(supabase: SupabaseClient<Database>, userId: string, ids: string[]) {
  const { data, error } = await supabase
    .from("documents")
    .select("id, title, subject")
    .eq("user_id", userId)
    .in("id", ids);

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
 * Chunks ordonnés d'un document pour un affichage humain (mode écran
 * partagé dans le chat) — contrairement à getDocumentsFullText, pas de
 * plafond de caractères : ce n'est pas injecté dans un prompt IA.
 */
export async function getDocumentChunksForDisplay(supabase: SupabaseClient<Database>, documentId: string) {
  const { data, error } = await supabase
    .from("document_chunks")
    .select("chunk_index, content")
    .eq("document_id", documentId)
    .order("chunk_index", { ascending: true });

  if (error) throw error;
  return data;
}

/**
 * Combine le texte de plusieurs documents (ex : plusieurs chapitres d'une
 * même matière) pour un examen ou un QCM qui les couvre tous. Le budget de
 * caractères est réparti équitablement entre les documents pour qu'un gros
 * chapitre n'écrase pas les autres. Une seule requête groupée récupère les
 * chunks de tous les documents (plutôt qu'une requête séquentielle par
 * document), regroupés ensuite en mémoire.
 */
export async function getDocumentsFullText(
  supabase: SupabaseClient<Database>,
  documents: { id: string; title: string }[],
  maxChars = 14000,
): Promise<string> {
  if (documents.length === 0) return "";

  const perDocBudget = Math.max(1000, Math.floor(maxChars / documents.length));

  const { data, error } = await supabase
    .from("document_chunks")
    .select("document_id, content, chunk_index")
    .in(
      "document_id",
      documents.map((d) => d.id),
    )
    .order("chunk_index", { ascending: true });

  if (error) throw error;

  const chunksByDocument = new Map<string, { content: string }[]>();
  for (const chunk of data ?? []) {
    const list = chunksByDocument.get(chunk.document_id);
    if (list) list.push(chunk);
    else chunksByDocument.set(chunk.document_id, [chunk]);
  }

  const parts: string[] = [];
  for (const doc of documents) {
    let text = "";
    for (const chunk of chunksByDocument.get(doc.id) ?? []) {
      if (text.length >= perDocBudget) break;
      text += (text ? "\n\n" : "") + chunk.content;
    }
    text = text.slice(0, perDocBudget);
    if (text) parts.push(`--- ${doc.title} ---\n${text}`);
  }

  return parts.join("\n\n");
}
