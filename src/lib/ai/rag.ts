import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";
import { embedText } from "@/lib/ai/embeddings";

export interface RetrievedChunk {
  documentId: string;
  documentTitle: string;
  chunkIndex: number;
  content: string;
  similarity: number;
}

/**
 * Recherche par similarité à travers un ou plusieurs documents : une requête
 * par document (le RPC `match_document_chunks` est scopé à un seul document
 * à la fois), résultats fusionnés et triés par similarité, tronqués au
 * budget total pour garder un prompt raisonnable même avec plusieurs
 * documents attachés à la conversation.
 */
export async function retrieveRelevantChunks(
  supabase: SupabaseClient<Database>,
  documents: { id: string; title: string }[],
  query: string,
  totalMatchCount = 8,
): Promise<RetrievedChunk[]> {
  if (documents.length === 0) return [];

  const queryEmbedding = await embedText(query);
  const perDocCount = Math.max(2, Math.ceil(totalMatchCount / documents.length));

  const results = await Promise.all(
    documents.map(async (doc) => {
      const { data, error } = await supabase.rpc("match_document_chunks", {
        p_document_id: doc.id,
        p_query_embedding: queryEmbedding,
        p_match_count: perDocCount,
      });
      if (error) throw error;
      return (data ?? []).map((row) => ({
        documentId: doc.id,
        documentTitle: doc.title,
        chunkIndex: row.chunk_index,
        content: row.content,
        similarity: row.similarity,
      }));
    }),
  );

  return results
    .flat()
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, totalMatchCount);
}
