import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/session";
import { listReadyDocuments } from "@/lib/documents/queries";
import { MemoireAnalysisTool } from "@/components/tools/memoire-analysis-tool";

export default async function MemoireAnalysisPage({
  searchParams,
}: {
  searchParams: Promise<{ documentId?: string }>;
}) {
  const { documentId } = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const documents = await listReadyDocuments(supabase, user.id);

  return <MemoireAnalysisTool documents={documents} initialDocumentId={documentId} />;
}
