import { streamObject } from "ai";
import { createClient } from "@/lib/supabase/server";
import { chatModel } from "@/lib/ai/openai";
import { GENERATORS } from "@/lib/ai/generators";
import { CREDIT_COSTS } from "@/lib/credits/costs";
import { deductCredits, hasEnoughCredits, InsufficientCreditsError } from "@/lib/credits/ledger";
import { resolveSource } from "@/lib/ai/source";
import { isTextTooLong, MAX_PASTED_TEXT_LENGTH } from "@/lib/ai/limits";
import type { GeneratedContentType } from "@/lib/types/database.types";

export const maxDuration = 120;

/**
 * Streame l'objet généré vers le client (pour l'affichage progressif), mais
 * la persistance en base ET le débit de crédits se font ici, côté serveur,
 * dans le onFinish de streamObject — qui s'exécute dès que le modèle a fini,
 * indépendamment de ce que fait le client ensuite.
 *
 * Avant, ces deux étapes étaient déclenchées par un second appel volontaire
 * du client (POST /api/generated-content) une fois le flux reçu en entier.
 * Rien n'obligeait ce second appel à avoir lieu : il suffisait de ne jamais
 * le faire pour obtenir des générations illimitées et gratuites. Le
 * `contentId` (généré côté client, comme une clé d'idempotence) permet au
 * client de connaître l'id du contenu sans dépendre de la réponse de ce
 * second appel, qui n'existe plus.
 */
export async function POST(req: Request, { params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;
  const generator = GENERATORS[type as GeneratedContentType];
  if (!generator) {
    return Response.json({ error: "UNKNOWN_GENERATOR" }, { status: 404 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  if (!(await hasEnoughCredits(supabase, user.id, generator.feature))) {
    return Response.json({ error: "INSUFFICIENT_CREDITS" }, { status: 402 });
  }

  const body = (await req.json()) as {
    contentId?: string;
    documentIds?: string[];
    conversationId?: string;
    text?: string;
    questionCount?: 10 | 20 | 50;
    durationMinutes?: number;
  };

  if (!body.contentId) {
    return Response.json({ error: "MISSING_CONTENT_ID" }, { status: 400 });
  }
  const contentId = body.contentId;

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
  const { sourceText, title: sourceTitle } = resolved;

  if (!sourceText.trim()) {
    return Response.json({ error: "NO_SOURCE_TEXT" }, { status: 400 });
  }

  const { system, prompt } = generator.build({
    sourceText,
    questionCount: body.questionCount,
    durationMinutes: body.durationMinutes,
  });

  const result = streamObject({
    model: chatModel(),
    schema: generator.schema,
    system,
    prompt,
    onFinish: async ({ object, error }) => {
      if (!object || error) {
        console.error("Generation failed to finish", type, contentId, error);
        return;
      }

      const title = (object as { title?: string }).title?.trim() || sourceTitle || "Contenu généré";

      const { error: insertError } = await supabase.from("generated_content").insert({
        id: contentId,
        user_id: user.id,
        document_id: documentIds[0] ?? null,
        document_ids: documentIds,
        type: type as GeneratedContentType,
        title,
        content: object,
        credits_used: CREDIT_COSTS[generator.feature],
      });

      if (insertError) {
        console.error("Generated content insert failed", type, contentId, insertError);
        return;
      }

      try {
        await deductCredits(supabase, user.id, generator.feature, { referenceId: contentId });
      } catch (err) {
        if (!(err instanceof InsufficientCreditsError)) throw err;
        // Une course entre requêtes concurrentes a épuisé le solde entre le
        // hasEnoughCredits plus haut et cette étape : le contenu reste
        // sauvegardé (le travail est déjà fait), simplement non facturé.
        console.error("Insufficient credits at charge time", type, contentId, err);
      }
    },
  });

  return result.toTextStreamResponse();
}
