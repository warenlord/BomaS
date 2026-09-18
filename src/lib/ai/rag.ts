import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";
import { embedText } from "@/lib/ai/embeddings";

export interface RetrievedChunk {
  id: string;
  chunkIndex: number;
  content: string;
  similarity: number;
}

export async function retrieveRelevantChunks(
  supabase: SupabaseClient<Database>,
  documentId: string,
  query: string,
  matchCount = 6,
): Promise<RetrievedChunk[]> {
  const queryEmbedding = await embedText(query);

  const { data, error } = await supabase.rpc("match_document_chunks", {
    p_document_id: documentId,
    p_query_embedding: queryEmbedding,
    p_match_count: matchCount,
  });

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    chunkIndex: row.chunk_index,
    content: row.content,
    similarity: row.similarity,
  }));
}
