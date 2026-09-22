import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getConversation, getConversationMessages } from "@/lib/chat/queries";
import { getDocumentChunksForDisplay, getDocumentsByIds, listReadyDocuments } from "@/lib/documents/queries";
import { toUIMessages } from "@/lib/chat/format";
import { ChatWindow } from "@/components/chat/chat-window";

export default async function ChatConversationPage({
  params,
  searchParams,
}: {
  params: Promise<{ conversationId: string }>;
  searchParams: Promise<{ autoSend?: string }>;
}) {
  const { conversationId } = await params;
  const { autoSend } = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = await createClient();

  const conversation = await getConversation(supabase, conversationId);
  if (!conversation || conversation.user_id !== user.id) notFound();

  const attachedIds =
    conversation.document_ids?.length > 0
      ? conversation.document_ids
      : conversation.document_id
        ? [conversation.document_id]
        : [];

  const [messages, attachedDocuments, readyDocuments] = await Promise.all([
    getConversationMessages(supabase, conversationId),
    attachedIds.length > 0 ? getDocumentsByIds(supabase, user.id, attachedIds) : Promise.resolve([]),
    listReadyDocuments(supabase, user.id),
  ]);

  const documentsWithChunks = await Promise.all(
    attachedDocuments.map(async (doc) => ({
      id: doc.id,
      title: doc.title,
      chunks: await getDocumentChunksForDisplay(supabase, doc.id),
    })),
  );

  const firstName = (user.user_metadata?.full_name as string | undefined)?.split(" ")[0];

  return (
    <ChatWindow
      conversationId={conversation.id}
      initialAttachedDocuments={attachedDocuments}
      documentsWithChunks={documentsWithChunks}
      availableDocuments={readyDocuments}
      initialMessages={toUIMessages(messages)}
      autoSendText={messages.length === 0 ? autoSend : undefined}
      greeting={firstName ? `Qu'est-ce qu'on révise aujourd'hui, ${firstName} ?` : undefined}
    />
  );
}
