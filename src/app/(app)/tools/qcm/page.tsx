import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/session";
import { listReadyDocuments } from "@/lib/documents/queries";
import { QcmTool } from "@/components/tools/qcm-tool";

export default async function QcmPage({
  searchParams,
}: {
  searchParams: Promise<{ documentId?: string }>;
}) {
  const { documentId } = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const documents = await listReadyDocuments(supabase, user.id);

  return <QcmTool documents={documents} initialDocumentId={documentId} />;
}
