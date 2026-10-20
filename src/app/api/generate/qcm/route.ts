import { randomUUID } from "node:crypto";
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
    territoryClaimId?: string;
  };

  const documentIds = body.documentIds ?? [];
  const usingSource = documentIds.length > 0 || Boolean(body.conversationId);

  if (!usingSource && isTextTooLong(body.text ?? "")) {
    return Response.json({ error: "TEXT_TOO_LONG", maxLength: MAX_PASTED_TEXT_LENGTH }, { status: 400 });
  }

  // Révision collective : une réclamation de territoire doit être active, à
  // soi, et dans les délais avant de dépenser des crédits sur sa génération.
  // On bloque aussi une seconde génération pour la même réclamation (sinon
  // on pourrait régénérer jusqu'à tomber sur un QCM facile, en repayant à
  // chaque fois).
  if (body.territoryClaimId) {
    const { data: claim, error: claimError } = await supabase
      .from("territory_claims")
      .select("id, user_id, status, deadline_at")
      .eq("id", body.territoryClaimId)
      .maybeSingle();

    if (claimError || !claim) {
      return Response.json({ error: "CLAIM_NOT_FOUND" }, { status: 404 });
    }
    if (claim.user_id !== user.id) {
      return Response.json({ error: "NOT_YOUR_CLAIM" }, { status: 403 });
    }
    if (claim.status !== "in_progress" || new Date(claim.deadline_at) <= new Date()) {
      return Response.json({ error: "CLAIM_EXPIRED" }, { status: 409 });
    }

    const { data: existing } = await supabase
      .from("generated_content")
      .select("id")
      .eq("territory_claim_id", body.territoryClaimId)
      .maybeSingle();
    if (existing) {
      return Response.json({ error: "ALREADY_GENERATED_FOR_CLAIM", id: existing.id }, { status: 409 });
    }
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

  // Généré avant le débit (et réutilisé comme id de la ligne insérée plus
  // bas) : ça donne au cron de nettoyage (cleanup-stuck-generations) une clé
  // fiable pour repérer une transaction "usage" sans generated_content
  // correspondant — le cas où la fonction est tuée par un timeout plateforme
  // entre le débit et l'insertion, qu'aucun catch applicatif ne peut attraper.
  const contentId = randomUUID();

  try {
    await deductCredits(supabase, user.id, "qcm", { referenceId: contentId });
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
      id: contentId,
      user_id: user.id,
      document_id: documentIds[0] ?? null,
      document_ids: documentIds,
      type: "qcm",
      title,
      content: object,
      credits_used: CREDIT_COSTS.qcm,
      territory_claim_id: body.territoryClaimId ?? null,
    })
    .select("id")
    .single();

  if (insertError || !saved) {
    if (insertError?.code === "23505") {
      // Course gagnée par une autre requête concurrente entre notre contrôle
      // d'existence (ligne 74) et cet insert : l'index unique sur
      // generated_content.territory_claim_id a bloqué cette seconde ligne.
      // On rembourse (rien à montrer pour un QCM qui n'existera jamais) et on
      // signale au client de se rafraîchir plutôt qu'une erreur générique.
      await addCredits(supabase, user.id, CREDIT_COSTS.qcm, "refund", {
        description: "Remboursement : génération déjà existante pour cette réclamation",
      });
      return Response.json({ error: "ALREADY_GENERATED_FOR_CLAIM" }, { status: 409 });
    }
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
