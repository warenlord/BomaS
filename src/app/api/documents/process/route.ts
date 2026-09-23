import { createClient } from "@/lib/supabase/server";
import { prepareDocumentChunks, embedAndStoreChunks } from "@/lib/documents/ingest";
import {
  addCredits,
  deductCreditsAmount,
  hasEnoughCredits,
  InsufficientCreditsError,
} from "@/lib/credits/ledger";
import { documentAnalysisCost } from "@/lib/credits/costs";
import type { DocumentFileType } from "@/lib/types/database.types";

export const maxDuration = 300;

/**
 * Étape 2/2 de l'import : le fichier est déjà dans Supabase Storage (upload
 * direct depuis le navigateur via l'URL signée de /upload-url). Cette route
 * ne reçoit qu'un chemin, télécharge le fichier serveur-à-serveur (aucune
 * limite de taille de requête ici) et lance l'extraction + les embeddings.
 *
 * Le tarif n'est plus fixe : extraire + découper (peu coûteux, pas d'appel
 * OpenAI) donne le nombre réel de morceaux, à partir duquel on calcule le
 * coût véritable (documentAnalysisCost) — un document de 300 pages ne coûte
 * pas la même chose à traiter qu'un de 30. Les crédits ne sont débités
 * qu'à ce moment-là, juste avant l'étape coûteuse (embeddings), et
 * remboursés si elle échoue.
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

  // Vérification rapide au tarif plancher : évite de télécharger/extraire
  // pour un utilisateur qui n'a de toute façon pas les 5 crédits minimum.
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
      status: "processing",
    })
    .select("*")
    .single();

  if (insertError || !document) {
    return Response.json({ error: "DB_INSERT_FAILED" }, { status: 500 });
  }

  let prepared;
  try {
    prepared = await prepareDocumentChunks(buffer, fileType);
  } catch (err) {
    console.error("Document extraction failed", document.id, err);
    await supabase
      .from("documents")
      .update({ status: "error", error_message: "L'extraction du contenu a échoué." })
      .eq("id", document.id);
    return Response.json({ error: "INGESTION_FAILED" }, { status: 500 });
  }

  if (prepared.chunks.length === 0) {
    const message = "Aucun texte exploitable n'a été trouvé dans ce fichier.";
    await supabase.from("documents").update({ status: "error", error_message: message }).eq("id", document.id);
    return Response.json({ error: "NO_EXTRACTABLE_TEXT", message }, { status: 422 });
  }

  const cost = documentAnalysisCost(prepared.chunks.length);

  try {
    await deductCreditsAmount(supabase, user.id, cost, "document_analysis", { referenceId: document.id });
  } catch (err) {
    if (err instanceof InsufficientCreditsError) {
      const message = `Ce document est volumineux et nécessite ${cost} crédits (tu en as ${err.available}).`;
      await supabase.from("documents").update({ status: "error", error_message: message }).eq("id", document.id);
      return Response.json({ error: "INSUFFICIENT_CREDITS", required: cost, message }, { status: 402 });
    }
    throw err;
  }

  try {
    await embedAndStoreChunks(supabase, document.id, prepared.chunks);
  } catch (err) {
    console.error("Document embedding failed", document.id, err);
    await addCredits(supabase, user.id, cost, "refund", {
      referenceId: document.id,
      description: "Remboursement : analyse de document échouée",
    });
    await supabase
      .from("documents")
      .update({ status: "error", error_message: "Le calcul des embeddings a échoué." })
      .eq("id", document.id);
    return Response.json({ error: "INGESTION_FAILED" }, { status: 500 });
  }

  await supabase
    .from("documents")
    .update({ status: "ready", page_count: prepared.pageCount })
    .eq("id", document.id);

  const { data: finalDocument } = await supabase.from("documents").select("*").eq("id", document.id).single();

  return Response.json({ document: finalDocument, creditsCharged: cost });
}
