import { generateObject } from "ai";
import { createClient } from "@/lib/supabase/server";
import { chatModel } from "@/lib/ai/openai";
import { memoireAnalysisSchema, memoireAnalysisPrompt } from "@/lib/ai/prompts";
import { memoireAnalysisCost } from "@/lib/credits/costs";
import { addCredits, deductCreditsAmount, InsufficientCreditsError } from "@/lib/credits/ledger";
import { resolveSource } from "@/lib/ai/source";
import { isTextTooLong } from "@/lib/ai/limits";

export const maxDuration = 300;

// Un mémoire complet peut faire 100+ pages : budget bien plus large que les
// 14000 caractères par défaut des autres générateurs (résumé, QCM...), qui
// ne visent qu'un extrait représentatif. Ici on veut voir le document en
// entier autant que possible — ~300k caractères reste dans la fenêtre de
// contexte du modèle.
const MEMOIRE_MAX_CHARS = 300_000;

/**
 * Route dédiée à l'analyse de mémoire (plutôt que /api/generate/[type], qui
 * streame et débite un tarif fixe après coup) : le tarif dépend de la taille
 * réelle du document (memoireAnalysisCost), connue dès que la source est
 * résolue — donc débité AVANT la génération (et remboursé si elle échoue),
 * comme pour QCM/examen, plutôt qu'un montant fixe qui sous-facturerait un
 * mémoire de 150 pages autant qu'un de 20.
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
  };

  const documentIds = body.documentIds ?? [];
  const usingSource = documentIds.length > 0;

  if (!usingSource && isTextTooLong(body.text ?? "", MEMOIRE_MAX_CHARS)) {
    return Response.json({ error: "TEXT_TOO_LONG", maxLength: MEMOIRE_MAX_CHARS }, { status: 400 });
  }

  const resolved = await resolveSource(
    supabase,
    user.id,
    { documentIds, text: body.text },
    MEMOIRE_MAX_CHARS,
  );
  if (!resolved.ok) {
    return Response.json({ error: resolved.error }, { status: 404 });
  }
  const { sourceText, title: documentTitle } = resolved;

  if (!sourceText.trim()) {
    return Response.json({ error: "NO_SOURCE_TEXT" }, { status: 400 });
  }

  const cost = memoireAnalysisCost(sourceText.length);

  try {
    await deductCreditsAmount(supabase, user.id, cost, "memoire_analysis");
  } catch (err) {
    if (err instanceof InsufficientCreditsError) {
      return Response.json({ error: "INSUFFICIENT_CREDITS", required: cost }, { status: 402 });
    }
    throw err;
  }

  const { system, prompt } = memoireAnalysisPrompt(sourceText);

  let object;
  try {
    const result = await generateObject({
      model: chatModel(),
      schema: memoireAnalysisSchema,
      system,
      prompt,
    });
    object = result.object;
  } catch (err) {
    console.error("Memoire analysis generation failed", err);
    await addCredits(supabase, user.id, cost, "refund", { description: "Remboursement : analyse de mémoire échouée" });
    return Response.json({ error: "GENERATION_FAILED" }, { status: 500 });
  }

  const title = object.title?.trim() || documentTitle || "Analyse de mémoire";

  const { data: saved, error: insertError } = await supabase
    .from("generated_content")
    .insert({
      user_id: user.id,
      document_id: documentIds[0] ?? null,
      document_ids: documentIds,
      type: "memoire_analysis",
      title,
      content: object,
      credits_used: cost,
    })
    .select("id")
    .single();

  if (insertError || !saved) {
    console.error("Memoire analysis insert failed", insertError);
    await addCredits(supabase, user.id, cost, "refund", { description: "Remboursement : sauvegarde analyse de mémoire échouée" });
    return Response.json({ error: "DB_INSERT_FAILED" }, { status: 500 });
  }

  return Response.json({ id: saved.id, creditsCharged: cost, ...object });
}
