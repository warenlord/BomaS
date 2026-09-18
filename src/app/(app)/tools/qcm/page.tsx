import { createClient } from "@/lib/supabase/server";
import { getDocument } from "@/lib/documents/queries";
import { QcmTool } from "@/components/tools/qcm-tool";

export default async function QcmPage({
  searchParams,
}: {
  searchParams: Promise<{ documentId?: string }>;
}) {
  const { documentId } = await searchParams;
  const supabase = await createClient();
  const document = documentId ? await getDocument(supabase, documentId) : null;

  return <QcmTool documentId={documentId} documentTitle={document?.title} />;
}
