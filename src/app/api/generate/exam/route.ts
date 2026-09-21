import { generateObject } from "ai";
import { createClient } from "@/lib/supabase/server";
import { chatModel } from "@/lib/ai/openai";
import { examSchema, examPrompt } from "@/lib/ai/prompts";
import { CREDIT_COSTS } from "@/lib/credits/costs";
import { addCredits, deductCredits, InsufficientCreditsError } from "@/lib/credits/ledger";
import { getDocumentsByIds, getDocumentsFullText } from "@/lib/documents/queries";
import { isTextTooLong, MAX_PASTED_TEXT_LENGTH } from "@/lib/ai/limits";

export const maxDuration = 120;

/**
 * Route dédiée à l'examen blanc (plutôt que /api/generate/[type], qui streame
 * l'objet brut vers le client) : comme pour le QCM, le corrigé (correctIndex,
 * modelAnswer) ne doit jamais transiter vers le navigateur avant que
 * l'étudiant ait rendu sa copie. On génère donc en une fois côté serveur, on
 * persiste immédiatement l'examen complet, puis on ne renvoie que les
 * énoncés — sans corrigé. Il n'est révélé qu'après soumission, via
 * /api/exam-attempts.
 *
 * Comme pour le QCM, les crédits sont débités AVANT l'appel au modèle (et
 * remboursés si la génération ou la sauvegarde échoue) pour éviter les
 * examens gratuits via une course entre requêtes concurrentes, et le déni de
 * service gratuit via un texte source volontairement énorme.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = (await req.json()) as {
    documentIds?: string[];
    text?: string;
    durationMinutes?: number;
  };

  let sourceText = body.text ?? "";
  const documentIds = body.documentIds ?? [];
  let documentTitle: string | null = null;

  if (documentIds.length > 0) {
    const selected = await getDocumentsByIds(supabase, user.id, documentIds);
    if (selected.length !== documentIds.length) {
      return Response.json({ error: "DOCUMENT_NOT_FOUND" }, { status: 404 });
    }
    documentTitle = selected.length === 1 ? selected[0].title : `${selected.length} documents`;
    sourceText = await getDocumentsFullText(supabase, selected);
  } else if (isTextTooLong(sourceText)) {
    return Response.json({ error: "TEXT_TOO_LONG", maxLength: MAX_PASTED_TEXT_LENGTH }, { status: 400 });
  }

  if (!sourceText.trim()) {
    return Response.json({ error: "NO_SOURCE_TEXT" }, { status: 400 });
  }

  try {
    await deductCredits(supabase, user.id, "exam");
  } catch (err) {
    if (err instanceof InsufficientCreditsError) {
      return Response.json({ error: "INSUFFICIENT_CREDITS" }, { status: 402 });
    }
    throw err;
  }

  const durationMinutes = body.durationMinutes ?? 60;
  const { system, prompt } = examPrompt(sourceText, durationMinutes);

  let object;
  try {
    const result = await generateObject({
      model: chatModel(),
      schema: examSchema,
      system,
      prompt,
    });
    object = result.object;
  } catch (err) {
    console.error("Exam generation failed", err);
    await addCredits(supabase, user.id, CREDIT_COSTS.exam, "refund", { description: "Remboursement : génération examen échouée" });
    return Response.json({ error: "GENERATION_FAILED" }, { status: 500 });
  }

  const title = object.title?.trim() || documentTitle || "Examen blanc";

  const { data: saved, error: insertError } = await supabase
    .from("generated_content")
    .insert({
      user_id: user.id,
      document_id: documentIds[0] ?? null,
      document_ids: documentIds,
      type: "exam",
      title,
      content: object,
      credits_used: CREDIT_COSTS.exam,
    })
    .select("id")
    .single();

  if (insertError || !saved) {
    console.error("Exam insert failed", insertError);
    await addCredits(supabase, user.id, CREDIT_COSTS.exam, "refund", { description: "Remboursement : sauvegarde examen échouée" });
    return Response.json({ error: "DB_INSERT_FAILED" }, { status: 500 });
  }

  return Response.json({
    id: saved.id,
    title: object.title,
    durationMinutes: object.durationMinutes,
    questions: object.questions.map((q) => ({ question: q.question, type: q.type, options: q.options, points: q.points })),
  });
}
