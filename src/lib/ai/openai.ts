import { createOpenAI } from "@ai-sdk/openai";

const openaiProvider = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/** Modèle de chat, configurable via OPENAI_CHAT_MODEL (ex : gpt-4.1, gpt-5, ...). */
export function chatModel() {
  return openaiProvider.chat(process.env.OPENAI_CHAT_MODEL || "gpt-4.1");
}

/** Modèle d'embeddings pour le RAG documentaire (1536 dimensions par défaut). */
export function embeddingModel() {
  return openaiProvider.embedding(process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small");
}
