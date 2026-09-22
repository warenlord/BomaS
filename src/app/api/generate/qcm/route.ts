import { generateObject } from "ai";
import { createClient } from "@/lib/supabase/server";
import { chatModel } from "@/lib/ai/openai";
import { qcmSchemaForCount, qcmPrompt } from "@/lib/ai/prompts";
import { CREDIT_COSTS } from "@/lib/credits/costs";
import { addCredits, deductCredits, InsufficientCreditsError } from "@/lib/credits/ledger";
import { resolveSource } from "@/lib/ai/source";
import { isTextTooLong, MAX_PASTED_TEXT_LENGTH } from "@/lib/ai/limits";

export const maxDuration = 120;

/**
 * Route dédiée au QCM (plutôt que /api/generate/[type], qui streame l'objet
 * brut vers le client) : le corrigé ne doit jamais transiter vers le
 * navigateur avant que l'étudiant ait soumis ses réponses. On génère donc en
 * une fois côté serveur (pas de streaming), on persiste immédiatement le QCM
 * complet, puis on ne renvoie que les questions et options — sans
 * `correctIndex` ni `explanation`. Le corrigé n'est révélé qu'après
 * soumission, via /api/qcm-attempts.
 *
 * Les crédits sont débités AVANT l'appel au modèle (et remboursés si la
 * génération ou la sauvegarde échoue), plutôt qu'après succès : ça évite
 * qu'une course entre requêtes concurrentes ne génère des QCM gratuits, et
 * qu'un texte volontairement énorme fasse échouer la génération à volonté
 * sans jamais coûter de crédit (tout en consommant de vrais tokens OpenAI).
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
    conversationId?: string;
    text?: string;
    questionCount?: 10 | 20 | 50;
  };

  const documentIds = body.documentIds ?? [];
  const usingSource = documentIds.length > 0 || Boolean(body.conversationId);

  if (!usingSource && isTextTooLong(body.text ?? "")) {
    return Response.json({ error: "TEXT_TOO_LONG", maxLength: MAX_PASTED_TEXT_LENGTH }, { status: 400 });
  }

  const resolved = await resolveSource(supabase, user.id, {
    documentIds,
    conversationId: body.conversationId,
    text: body.text,
  });
  if (!resolved.ok) {
    return Response.json({ error: resolved.error }, { status: 404 });
  }
  const { sourceText, title: documentTitle } = resolved;

  if (!sourceText.trim()) {
    return Response.json({ error: "NO_SOURCE_TEXT" }, { status: 400 });
  }

  try {
    await deductCredits(supabase, user.id, "qcm");
  } catch (err) {
    if (err instanceof InsufficientCreditsError) {
      return Response.json({ error: "INSUFFICIENT_CREDITS" }, { status: 402 });
    }
    throw err;
  }

  const questionCount = body.questionCount ?? 10;
  const { system, prompt } = qcmPrompt(sourceText, questionCount);

  let object;
  try {
    const result = await generateObject({
      model: chatModel(),
      schema: qcmSchemaForCount(questionCount),
      system,
      prompt,
    });
    object = result.object;
  } catch (err) {
    console.error("QCM generation failed", err);
    await addCredits(supabase, user.id, CREDIT_COSTS.qcm, "refund", { description: "Remboursement : génération QCM échouée" });
    return Response.json({ error: "GENERATION_FAILED" }, { status: 500 });
  }

  const title = object.title?.trim() || documentTitle || "QCM";

  const { data: saved, error: insertError } = await supabase
    .from("generated_content")
    .insert({
      user_id: user.id,
      document_id: documentIds[0] ?? null,
      document_ids: documentIds,
      type: "qcm",
      title,
      content: object,
      credits_used: CREDIT_COSTS.qcm,
    })
    .select("id")
    .single();

  if (insertError || !saved) {
    console.error("QCM insert failed", insertError);
    await addCredits(supabase, user.id, CREDIT_COSTS.qcm, "refund", { description: "Remboursement : sauvegarde QCM échouée" });
    return Response.json({ error: "DB_INSERT_FAILED" }, { status: 500 });
  }

  return Response.json({
    id: saved.id,
    title: object.title,
    questions: object.questions.map((q) => ({ question: q.question, options: q.options })),
  });
}
