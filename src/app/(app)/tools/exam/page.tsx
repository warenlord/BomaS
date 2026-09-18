import { createClient } from "@/lib/supabase/server";
import { getDocument } from "@/lib/documents/queries";
import { ExamTool } from "@/components/tools/exam-tool";

export default async function ExamPage({
  searchParams,
}: {
  searchParams: Promise<{ documentId?: string }>;
}) {
  const { documentId } = await searchParams;
  const supabase = await createClient();
  const document = documentId ? await getDocument(supabase, documentId) : null;

  return <ExamTool documentId={documentId} documentTitle={document?.title} />;
}
