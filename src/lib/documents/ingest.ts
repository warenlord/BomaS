import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";
import { extractText } from "@/lib/documents/extract";
import { chunkText } from "@/lib/documents/chunk";
import { embedTexts } from "@/lib/ai/embeddings";

/**
 * Pipeline complet d'ingestion d'un document : extraction du texte, découpage,
 * calcul des embeddings et insertion des chunks. Met à jour le statut du
 * document tout au long du traitement.
 */
export async function ingestDocument(
  supabase: SupabaseClient<Database>,
  documentId: string,
  fileBuffer: Buffer,
  fileType: "pdf" | "docx",
): Promise<void> {
  await supabase.from("documents").update({ status: "processing" }).eq("id", documentId);

  try {
    const { text, pageCount } = await extractText(fileBuffer, fileType);
    const chunks = chunkText(text);

    if (chunks.length === 0) {
      const message = "Aucun texte exploitable n'a été trouvé dans ce fichier.";
      await supabase.from("documents").update({ status: "error", error_message: message }).eq("id", documentId);
      // On lève quand même une exception (plutôt qu'un retour silencieux) pour
      // que l'appelant sache que l'ingestion a échoué et ne débite/ne garde
      // pas de crédits déjà réservés pour un document resté en erreur.
      throw new Error(message);
    }

    const embeddings = await embedTexts(chunks.map((c) => c.content));

    const rows = chunks.map((chunk, i) => ({
      document_id: documentId,
      chunk_index: chunk.index,
      content: chunk.content,
      embedding: embeddings[i],
    }));

    const { error: insertError } = await supabase.from("document_chunks").insert(rows);
    if (insertError) throw insertError;

    await supabase
      .from("documents")
      .update({ status: "ready", page_count: pageCount })
      .eq("id", documentId);
  } catch (err) {
    await supabase
      .from("documents")
      .update({
        status: "error",
        error_message: err instanceof Error ? err.message : "Erreur inconnue lors du traitement du document.",
      })
      .eq("id", documentId);
    throw err;
  }
}
