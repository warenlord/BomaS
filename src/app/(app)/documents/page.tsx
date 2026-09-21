import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/session";
import { listDocuments } from "@/lib/documents/queries";
import { getCachedUserSubscription } from "@/lib/billing/subscription";
import { UploadWithSubject } from "@/components/documents/upload-with-subject";
import { DocumentList } from "@/components/documents/document-list";

export default async function DocumentsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const [documents, { plan }] = await Promise.all([
    listDocuments(supabase, user.id),
    getCachedUserSubscription(user.id),
  ]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Mes documents</h1>
          <p className="text-sm text-muted-foreground">
            {plan.max_pdfs
              ? `${documents.length} / ${plan.max_pdfs} documents utilisés sur le plan ${plan.name}`
              : `${documents.length} documents · PDF illimités sur le plan ${plan.name}`}
          </p>
        </div>
      </div>

      <UploadWithSubject />

      <DocumentList documents={documents} />
    </div>
  );
}
