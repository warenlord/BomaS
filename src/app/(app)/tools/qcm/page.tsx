import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/session";
import { listReadyDocuments } from "@/lib/documents/queries";
import { getConversationSource } from "@/lib/chat/queries";
import { QcmTool } from "@/components/tools/qcm-tool";

export default async function QcmPage({
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

  return <QcmTool documents={documents} initialDocumentId={documentId} conversationSource={conversationSource} />;
}
