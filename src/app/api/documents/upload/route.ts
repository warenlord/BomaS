import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { getUserSubscription } from "@/lib/billing/subscription";
import { countReadyDocuments } from "@/lib/documents/queries";
import { ingestDocument } from "@/lib/documents/ingest";
import { deductCredits, hasEnoughCredits } from "@/lib/credits/ledger";
import type { DocumentFileType } from "@/lib/types/database.types";

export const maxDuration = 300;

const MIME_TO_TYPE: Record<string, DocumentFileType> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
};

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  if (!(await hasEnoughCredits(supabase, user.id, "document_analysis"))) {
    return Response.json({ error: "INSUFFICIENT_CREDITS" }, { status: 402 });
  }

  const formData = await req.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return Response.json({ error: "NO_FILE" }, { status: 400 });
  }

  const fileType = MIME_TO_TYPE[file.type];
  if (!fileType) {
    return Response.json({ error: "UNSUPPORTED_FILE_TYPE" }, { status: 400 });
  }

  const { plan } = await getUserSubscription(supabase, user.id);
  if (plan.max_pdfs !== null) {
    const existingCount = await countReadyDocuments(supabase, user.id);
    if (existingCount >= plan.max_pdfs) {
      return Response.json(
        { error: "PDF_LIMIT_REACHED", limit: plan.max_pdfs },
        { status: 403 },
      );
    }
  }

  const storagePath = `${user.id}/${randomUUID()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_")}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage.from("documents").upload(storagePath, buffer, {
    contentType: file.type,
  });
  if (uploadError) {
    return Response.json({ error: "UPLOAD_FAILED", message: uploadError.message }, { status: 500 });
  }

  const { data: document, error: insertError } = await supabase
    .from("documents")
    .insert({
      user_id: user.id,
      title: file.name.replace(/\.(pdf|docx)$/i, ""),
      file_path: storagePath,
      file_type: fileType,
      status: "pending",
    })
    .select("*")
    .single();

  if (insertError || !document) {
    return Response.json({ error: "DB_INSERT_FAILED" }, { status: 500 });
  }

  try {
    await ingestDocument(supabase, document.id, buffer, fileType);
    await deductCredits(supabase, user.id, "document_analysis", { referenceId: document.id });
  } catch (err) {
    return Response.json(
      { error: "INGESTION_FAILED", message: err instanceof Error ? err.message : "Erreur inconnue" },
      { status: 500 },
    );
  }

  const { data: finalDocument } = await supabase.from("documents").select("*").eq("id", document.id).single();

  return Response.json({ document: finalDocument });
}
