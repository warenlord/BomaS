import { createClient } from "@/lib/supabase/server";
import { ingestDocument } from "@/lib/documents/ingest";
import { deductCredits, hasEnoughCredits } from "@/lib/credits/ledger";
import type { DocumentFileType } from "@/lib/types/database.types";

export const maxDuration = 300;

/**
 * Étape 2/2 de l'import : le fichier est déjà dans Supabase Storage (upload
 * direct depuis le navigateur via l'URL signée de /upload-url). Cette route
 * ne reçoit qu'un chemin, télécharge le fichier serveur-à-serveur (aucune
 * limite de taille de requête ici) et lance l'extraction + les embeddings.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { path, title, fileType, subject } = (await req.json()) as {
    path: string;
    title: string;
    fileType: DocumentFileType;
    subject?: string | null;
  };

  if (!path.startsWith(`${user.id}/`)) {
    return Response.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  if (!(await hasEnoughCredits(supabase, user.id, "document_analysis"))) {
    return Response.json({ error: "INSUFFICIENT_CREDITS" }, { status: 402 });
  }

  const { data: fileData, error: downloadError } = await supabase.storage.from("documents").download(path);
  if (downloadError || !fileData) {
    return Response.json({ error: "DOWNLOAD_FAILED", message: downloadError?.message }, { status: 500 });
  }
  const buffer = Buffer.from(await fileData.arrayBuffer());

  const { data: document, error: insertError } = await supabase
    .from("documents")
    .insert({
      user_id: user.id,
      title,
      subject: subject ?? null,
      file_path: path,
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
