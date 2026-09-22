import { convertToModelMessages, smoothStream, streamText } from "ai";
import { createClient } from "@/lib/supabase/server";
import { chatModel } from "@/lib/ai/openai";
import { CHAT_SYSTEM_PROMPT, ragSystemPrompt } from "@/lib/ai/prompts";
import { retrieveRelevantChunks } from "@/lib/ai/rag";
import { deductCredits, hasEnoughCredits } from "@/lib/credits/ledger";
import { extractText, type ChatUIMessage, type Citation } from "@/lib/chat/format";
import { maybeRenameConversation } from "@/lib/chat/queries";
import { getDocumentsByIds } from "@/lib/documents/queries";
import { isTextTooLong, MAX_PASTED_TEXT_LENGTH } from "@/lib/ai/limits";

export const maxDuration = 60;

export async function POST(req: Request) {
  const { messages, conversationId, documentIds } = (await req.json()) as {
    messages: ChatUIMessage[];
    conversationId?: string;
    documentIds?: string[];
  };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  if (!conversationId) {
    return Response.json({ error: "MISSING_CONVERSATION" }, { status: 400 });
  }
  if (!(await hasEnoughCredits(supabase, user.id, "chat"))) {
    return Response.json({ error: "INSUFFICIENT_CREDITS" }, { status: 402 });
  }

  const userMessages = messages.filter((m) => m.role === "user");
  const lastUserMessage = userMessages.at(-1);
  const userText = lastUserMessage ? extractText(lastUserMessage) : "";

  if (isTextTooLong(userText)) {
    return Response.json({ error: "TEXT_TOO_LONG", maxLength: MAX_PASTED_TEXT_LENGTH }, { status: 400 });
  }

  if (userText) {
    await supabase.from("messages").insert({
      conversation_id: conversationId,
      role: "user",
      content: userText,
    });

    if (userMessages.length === 1) {
      void maybeRenameConversation(supabase, conversationId, userText);
    }
  }

  let system = CHAT_SYSTEM_PROMPT;
  let citations: Citation[] = [];

  // Les documents attachés viennent du client à chaque requête (menu pièce-
  // jointe, @mention, glisser-déposer) : on revalide toujours leur
  // appartenance ici plutôt que de faire confiance à la liste envoyée, et on
  // persiste le résultat sur la conversation pour qu'il survive au rechargement.
  // Si le client n'envoie rien du tout (documentIds absent, pas juste vide),
  // on retombe sur ce qui est déjà persisté plutôt que d'effacer l'existant.
  let documents: { id: string; title: string; subject: string | null }[] = [];

  if (documentIds !== undefined) {
    const requestedIds = [...new Set(documentIds)];
    documents = requestedIds.length > 0 ? await getDocumentsByIds(supabase, user.id, requestedIds) : [];
    await supabase
      .from("conversations")
      .update({ document_ids: documents.map((d) => d.id), document_id: documents[0]?.id ?? null })
      .eq("id", conversationId);
  } else {
    const { data: conversation } = await supabase
      .from("conversations")
      .select("document_ids, document_id")
      .eq("id", conversationId)
      .single();
    const existingIds = conversation?.document_ids?.length
      ? conversation.document_ids
      : conversation?.document_id
        ? [conversation.document_id]
        : [];
    documents = existingIds.length > 0 ? await getDocumentsByIds(supabase, user.id, existingIds) : [];
  }

  if (documents.length > 0) {
    const chunks = await retrieveRelevantChunks(supabase, documents, userText);
    citations = chunks.map((c, i) => ({
      index: i + 1,
      excerpt: c.content.slice(0, 240),
      documentId: c.documentId,
      documentTitle: c.documentTitle,
      chunkIndex: c.chunkIndex,
    }));
    system = ragSystemPrompt(chunks.map((c) => ({ documentTitle: c.documentTitle, content: c.content })));
  }

  const result = streamText({
    model: chatModel(),
    system,
    messages: await convertToModelMessages(messages),
    // OpenAI streame parfois si vite (des dizaines de mots en <1s) que sans
    // lissage, la réponse semble apparaître d'un bloc plutôt que "s'écrire".
    experimental_transform: smoothStream({ delayInMs: 15, chunking: "word" }),
    onFinish: async ({ text }) => {
      await supabase.from("messages").insert({
        conversation_id: conversationId,
        role: "assistant",
        content: text,
        citations: citations.length > 0 ? citations : null,
        credits_used: 1,
      });

      try {
        await deductCredits(supabase, user.id, "chat", { referenceId: conversationId });
      } catch (err) {
        // Le message est déjà enregistré : un échec de débit ne doit pas invalider
        // la réponse déjà streamée. On journalise quand même — un échec silencieux
        // rendait ces pertes de crédit invisibles en prod.
        console.error("Chat credit deduction failed", conversationId, err);
      }

      await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);
    },
  });

  return result.toUIMessageStreamResponse({
    messageMetadata: () => (citations.length > 0 ? { citations } : undefined),
  });
}
