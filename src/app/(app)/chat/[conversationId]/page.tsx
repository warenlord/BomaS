import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getConversation, getConversationMessages } from "@/lib/chat/queries";
import { getDocumentChunksForDisplay } from "@/lib/documents/queries";
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

  const messages = await getConversationMessages(supabase, conversationId);

  let documentTitle: string | null = null;
  let documentChunks: { chunk_index: number; content: string }[] | undefined;
  if (conversation.document_id) {
    const [{ data: document }, chunks] = await Promise.all([
      supabase.from("documents").select("title").eq("id", conversation.document_id).single(),
      getDocumentChunksForDisplay(supabase, conversation.document_id),
    ]);
    documentTitle = document?.title ?? null;
    documentChunks = chunks;
  }

  const firstName = (user.user_metadata?.full_name as string | undefined)?.split(" ")[0];

  return (
    <ChatWindow
      conversationId={conversation.id}
      documentId={conversation.document_id}
      documentTitle={documentTitle}
      documentChunks={documentChunks}
      initialMessages={toUIMessages(messages)}
      autoSendText={messages.length === 0 ? autoSend : undefined}
      greeting={firstName ? `Qu'est-ce qu'on révise aujourd'hui, ${firstName} ?` : undefined}
    />
  );
}
