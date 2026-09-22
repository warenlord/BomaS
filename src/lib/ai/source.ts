import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";
import { getDocumentsByIds, getDocumentsFullText } from "@/lib/documents/queries";
import { getConversation, getConversationText } from "@/lib/chat/queries";

const MAX_SOURCE_CHARS = 14000;

export interface SourceInput {
  documentIds?: string[];
  conversationId?: string;
  text?: string;
}

export type ResolvedSource =
  | { ok: true; sourceText: string; title: string | null }
  | { ok: false; error: "DOCUMENT_NOT_FOUND" | "CONVERSATION_NOT_FOUND" };

export function buildSourceTitle(conversationTitle: string | null, documents: { title: string }[]): string | null {
  if (conversationTitle && documents.length > 0) {
    return documents.length === 1 ? `${conversationTitle} + ${documents[0].title}` : `${conversationTitle} + ${documents.length} documents`;
  }
  if (conversationTitle) return conversationTitle;
  if (documents.length === 1) return documents[0].title;
  if (documents.length > 1) return `${documents.length} documents`;
  return null;
}

/**
 * Résout la source d'un générateur : documents sélectionnés et/ou discussion
 * de chat d'origine, combinés en un seul texte (le budget de caractères est
 * partagé entre les deux quand les deux sont utilisés). Si ni document ni
 * discussion n'est fourni, retombe sur le texte collé librement.
 */
export async function resolveSource(
  supabase: SupabaseClient<Database>,
  userId: string,
  input: SourceInput,
): Promise<ResolvedSource> {
  const documentIds = input.documentIds ?? [];
  const hasDocuments = documentIds.length > 0;
  const hasConversation = Boolean(input.conversationId);

  if (!hasDocuments && !hasConversation) {
    return { ok: true, sourceText: input.text ?? "", title: null };
  }

  const parts: string[] = [];
  let conversationTitle: string | null = null;
  let documents: { id: string; title: string; subject: string | null }[] = [];

  if (hasConversation) {
    const conversation = await getConversation(supabase, input.conversationId!);
    if (!conversation || conversation.user_id !== userId) {
      return { ok: false, error: "CONVERSATION_NOT_FOUND" };
    }
    conversationTitle = conversation.title;
    const budget = hasDocuments ? Math.floor(MAX_SOURCE_CHARS / 2) : MAX_SOURCE_CHARS;
    const conversationText = await getConversationText(supabase, conversation.id, budget);
    if (conversationText) parts.push(`--- Discussion : ${conversation.title} ---\n${conversationText}`);
  }

  if (hasDocuments) {
    documents = await getDocumentsByIds(supabase, userId, documentIds);
    if (documents.length !== documentIds.length) {
      return { ok: false, error: "DOCUMENT_NOT_FOUND" };
    }
    const budget = hasConversation ? Math.floor(MAX_SOURCE_CHARS / 2) : MAX_SOURCE_CHARS;
    const documentsText = await getDocumentsFullText(supabase, documents, budget);
    if (documentsText) parts.push(documentsText);
  }

  return { ok: true, sourceText: parts.join("\n\n"), title: buildSourceTitle(conversationTitle, documents) };
}
