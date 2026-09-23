import { embed, embedMany } from "ai";
import { embeddingModel } from "@/lib/ai/openai";

export async function embedText(text: string): Promise<number[]> {
  const { embedding } = await embed({
    model: embeddingModel(),
    value: text,
  });
  return embedding;
}

const EMBED_BATCH_SIZE = 100;

/**
 * Découpe en lots plutôt qu'un seul appel géant : un document volumineux
 * (plusieurs centaines de morceaux) risquerait de dépasser les limites de
 * taille de requête d'OpenAI en un seul envoi, et un lot plus petit qui
 * échoue est moins coûteux à diagnostiquer qu'un unique appel monstre.
 */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const results: number[][] = [];
  for (let i = 0; i < texts.length; i += EMBED_BATCH_SIZE) {
    const batch = texts.slice(i, i + EMBED_BATCH_SIZE);
    const { embeddings } = await embedMany({
      model: embeddingModel(),
      values: batch,
    });
    results.push(...embeddings);
  }

  return results;
}
