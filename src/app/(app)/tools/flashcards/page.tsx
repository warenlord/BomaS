import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/session";
import { listReadyDocuments } from "@/lib/documents/queries";
import { getConversationSource } from "@/lib/chat/queries";
import { FlashcardsTool } from "@/components/tools/flashcards-tool";

export default async function FlashcardsPage({
  searchParams,
}: {
  searchParams: Promise<{ documentId?: string; conversationId?: string }>;
}) {
  const { documentId, conversationId } = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const [documents, conversationSource] = await Promise.all([
    listReadyDocuments(supabase, user.id),
    getConversationSource(supabase, user.id, conversationId),
  ]);

  return (
    <FlashcardsTool documents={documents} initialDocumentId={documentId} conversationSource={conversationSource} />
  );
}
