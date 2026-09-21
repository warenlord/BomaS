import { generateObject } from "ai";
import { createClient } from "@/lib/supabase/server";
import { chatModel } from "@/lib/ai/openai";
import { qcmSchema, qcmPrompt } from "@/lib/ai/prompts";
import { CREDIT_COSTS } from "@/lib/credits/costs";
import { deductCredits, hasEnoughCredits, InsufficientCreditsError } from "@/lib/credits/ledger";
import { getDocument, getDocumentFullText } from "@/lib/documents/queries";

export const maxDuration = 120;

/**
 * Route dédiée au QCM (plutôt que /api/generate/[type], qui streame l'objet
 * brut vers le client) : le corrigé ne doit jamais transiter vers le
 * navigateur avant que l'étudiant ait soumis ses réponses. On génère donc en
 * une fois côté serveur (pas de streaming), on persiste immédiatement le QCM
 * complet, puis on ne renvoie que les questions et options — sans
 * `correctIndex` ni `explanation`. Le corrigé n'est révélé qu'après
 * soumission, via /api/qcm-attempts.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  if (!(await hasEnoughCredits(supabase, user.id, "qcm"))) {
    return Response.json({ error: "INSUFFICIENT_CREDITS" }, { status: 402 });
  }

  const body = (await req.json()) as {
    documentId?: string;
    text?: string;
    questionCount?: 10 | 20 | 50;
  };

  let sourceText = body.text ?? "";
  let documentTitle: string | null = null;

  if (body.documentId) {
    const document = await getDocument(supabase, body.documentId);
    if (!document || document.user_id !== user.id) {
      return Response.json({ error: "DOCUMENT_NOT_FOUND" }, { status: 404 });
    }
    documentTitle = document.title;
    sourceText = await getDocumentFullText(supabase, body.documentId);
  }

  if (!sourceText.trim()) {
    return Response.json({ error: "NO_SOURCE_TEXT" }, { status: 400 });
  }

  const { system, prompt } = qcmPrompt(sourceText, body.questionCount ?? 10);

  let object;
  try {
    const result = await generateObject({ model: chatModel(), schema: qcmSchema, system, prompt });
    object = result.object;
  } catch {
    return Response.json({ error: "GENERATION_FAILED" }, { status: 500 });
  }

  const title = object.title?.trim() || documentTitle || "QCM";

  const { data: saved, error: insertError } = await supabase
    .from("generated_content")
    .insert({
      user_id: user.id,
      document_id: body.documentId ?? null,
      type: "qcm",
      title,
      content: object,
      credits_used: CREDIT_COSTS.qcm,
    })
    .select("id")
    .single();

  if (insertError || !saved) {
    return Response.json({ error: "DB_INSERT_FAILED" }, { status: 500 });
  }

  let warning: string | undefined;
  try {
    await deductCredits(supabase, user.id, "qcm", { referenceId: saved.id });
  } catch (err) {
    if (!(err instanceof InsufficientCreditsError)) throw err;
    warning = "INSUFFICIENT_CREDITS_NOT_CHARGED";
  }

  return Response.json({
    id: saved.id,
    title: object.title,
    questions: object.questions.map((q) => ({ question: q.question, options: q.options })),
    warning,
  });
}
