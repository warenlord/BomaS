import { redirect } from "next/navigation";
import { FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/session";
import { listDocuments } from "@/lib/documents/queries";
import { getCachedUserSubscription } from "@/lib/billing/subscription";
import { UploadDropzone } from "@/components/documents/upload-dropzone";
import { DocumentStatusBadge } from "@/components/documents/status-badge";
import { DocumentActions } from "@/components/documents/document-actions";
import { formatDateShort } from "@/lib/format";

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

      <UploadDropzone />

      {documents.length === 0 ? (
        <div className="mt-8 flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border py-16 text-center text-muted-foreground">
          <FileText className="size-8" />
          <p className="text-sm">Importe ton premier cours en PDF ou Word.</p>
        </div>
      ) : (
        <ul className="mt-6 space-y-2">
          {documents.map((doc) => (
            <li
              key={doc.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-card px-4 py-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                <FileText className="size-5 shrink-0 text-primary" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{doc.title}</p>
                  <p className="text-xs text-muted-foreground">{formatDateShort(doc.created_at)}</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <DocumentStatusBadge status={doc.status} />
                <DocumentActions documentId={doc.id} ready={doc.status === "ready"} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
