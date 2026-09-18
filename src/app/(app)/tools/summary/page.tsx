import { createClient } from "@/lib/supabase/server";
import { getDocument } from "@/lib/documents/queries";
import { SummaryTool } from "@/components/tools/summary-tool";

export default async function SummaryPage({
  searchParams,
}: {
  searchParams: Promise<{ documentId?: string }>;
}) {
  const { documentId } = await searchParams;
  const supabase = await createClient();
  const document = documentId ? await getDocument(supabase, documentId) : null;

  return <SummaryTool documentId={documentId} documentTitle={document?.title} />;
}
