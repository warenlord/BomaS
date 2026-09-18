import { createClient } from "@/lib/supabase/server";
import { getDocument } from "@/lib/documents/queries";
import { RevisionSheetTool } from "@/components/tools/revision-sheet-tool";

export default async function RevisionSheetPage({
  searchParams,
}: {
  searchParams: Promise<{ documentId?: string }>;
}) {
  const { documentId } = await searchParams;
  const supabase = await createClient();
  const document = documentId ? await getDocument(supabase, documentId) : null;

  return <RevisionSheetTool documentId={documentId} documentTitle={document?.title} />;
}
