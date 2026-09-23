import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";
import { extractText } from "@/lib/documents/extract";
import { chunkText, type TextChunk } from "@/lib/documents/chunk";
import { embedTexts } from "@/lib/ai/embeddings";

export interface PreparedDocument {
  pageCount: number | null;
  chunks: TextChunk[];
}

/**
 * Étape 1 (bon marché) : extraction du texte + découpage, sans appel OpenAI.
 * Le nombre de morceaux obtenu ici sert à calculer le tarif réel de
 * l'analyse (voir documentAnalysisCost) avant de lancer l'étape coûteuse.
 */
export async function prepareDocumentChunks(fileBuffer: Buffer, fileType: "pdf" | "docx"): Promise<PreparedDocument> {
  const { text, pageCount } = await extractText(fileBuffer, fileType);
  return { pageCount, chunks: chunkText(text) };
}

/**
 * Étape 2 (coûteuse) : calcule les embeddings et insère les morceaux. À
 * n'appeler qu'après avoir débité le tarif réel — cette étape ne gère plus
 * elle-même le statut du document ni les crédits, laissés à l'appelant qui
 * orchestre les deux étapes.
 */
export async function embedAndStoreChunks(
  supabase: SupabaseClient<Database>,
  documentId: string,
  chunks: TextChunk[],
): Promise<void> {
  const embeddings = await embedTexts(chunks.map((c) => c.content));

  const rows = chunks.map((chunk, i) => ({
    document_id: documentId,
    chunk_index: chunk.index,
    content: chunk.content,
    embedding: embeddings[i],
  }));

  const { error } = await supabase.from("document_chunks").insert(rows);
  if (error) throw error;
}
