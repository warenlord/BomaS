import { convertToModelMessages, smoothStream, streamText } from "ai";
import { createClient } from "@/lib/supabase/server";
import { chatModel } from "@/lib/ai/openai";
import { CHAT_SYSTEM_PROMPT, ragSystemPrompt } from "@/lib/ai/prompts";
import { retrieveRelevantChunks } from "@/lib/ai/rag";
import { deductCredits, hasEnoughCredits } from "@/lib/credits/ledger";
import { extractText, type ChatUIMessage, type Citation } from "@/lib/chat/format";
import { maybeRenameConversation } from "@/lib/chat/queries";

export const maxDuration = 60;

export async function POST(req: Request) {
  const { messages, conversationId, documentId } = (await req.json()) as {
    messages: ChatUIMessage[];
    conversationId?: string;
    documentId?: string;
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

  if (documentId) {
    const { data: document } = await supabase.from("documents").select("title").eq("id", documentId).single();
    if (document) {
      const chunks = await retrieveRelevantChunks(supabase, documentId, userText);
      citations = chunks.map((c) => ({ chunkIndex: c.chunkIndex, excerpt: c.content.slice(0, 240) }));
      system = ragSystemPrompt(
        document.title,
        chunks.map((c) => ({ index: c.chunkIndex, content: c.content })),
      );
    }
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
      } catch {
        // Le message est déjà enregistré : un échec de débit ne doit pas invalider la réponse déjà streamée.
      }

      await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);
    },
  });

  return result.toUIMessageStreamResponse({
    messageMetadata: () => (citations.length > 0 ? { citations } : undefined),
  });
}
