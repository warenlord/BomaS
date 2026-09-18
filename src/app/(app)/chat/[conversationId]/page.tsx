import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getConversation, getConversationMessages } from "@/lib/chat/queries";
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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const conversation = await getConversation(supabase, conversationId);
  if (!conversation || conversation.user_id !== user.id) notFound();

  const messages = await getConversationMessages(supabase, conversationId);

  let documentTitle: string | null = null;
  if (conversation.document_id) {
    const { data: document } = await supabase
      .from("documents")
      .select("title")
      .eq("id", conversation.document_id)
      .single();
    documentTitle = document?.title ?? null;
  }

  return (
    <ChatWindow
      conversationId={conversation.id}
      documentId={conversation.document_id}
      documentTitle={documentTitle}
      initialMessages={toUIMessages(messages)}
      autoSendText={messages.length === 0 ? autoSend : undefined}
    />
  );
}
