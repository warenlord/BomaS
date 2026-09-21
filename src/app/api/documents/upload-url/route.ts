import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { getUserSubscription } from "@/lib/billing/subscription";
import { countReadyDocuments } from "@/lib/documents/queries";
import { hasEnoughCredits } from "@/lib/credits/ledger";
import type { DocumentFileType } from "@/lib/types/database.types";

const MIME_TO_TYPE: Record<string, DocumentFileType> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
};

/**
 * Étape 1/2 de l'import : génère une URL signée permettant au navigateur
 * d'envoyer le fichier DIRECTEMENT à Supabase Storage, sans repasser par
 * cette fonction serverless. Nécessaire pour les fichiers de plus de 4,5 Mo,
 * limite stricte des requêtes entrantes sur les fonctions Vercel.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { fileName, mimeType } = (await req.json()) as { fileName: string; mimeType: string };

  const fileType = MIME_TO_TYPE[mimeType];
  if (!fileType) {
    return Response.json({ error: "UNSUPPORTED_FILE_TYPE" }, { status: 400 });
  }

  if (!(await hasEnoughCredits(supabase, user.id, "document_analysis"))) {
    return Response.json({ error: "INSUFFICIENT_CREDITS" }, { status: 402 });
  }

  const { plan } = await getUserSubscription(supabase, user.id);
  if (plan.max_pdfs !== null) {
    const existingCount = await countReadyDocuments(supabase, user.id);
    if (existingCount >= plan.max_pdfs) {
      return Response.json({ error: "PDF_LIMIT_REACHED", limit: plan.max_pdfs }, { status: 403 });
    }
  }

  const storagePath = `${user.id}/${randomUUID()}-${fileName.replace(/[^a-zA-Z0-9.\-_]/g, "_")}`;

  const { data, error } = await supabase.storage.from("documents").createSignedUploadUrl(storagePath);
  if (error || !data) {
    return Response.json({ error: "SIGN_FAILED", message: error?.message }, { status: 500 });
  }

  return Response.json({
    path: data.path,
    token: data.token,
    fileType,
    title: fileName.replace(/\.(pdf|docx)$/i, ""),
  });
}
