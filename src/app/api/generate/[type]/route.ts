import { streamObject } from "ai";
import { createClient } from "@/lib/supabase/server";
import { chatModel } from "@/lib/ai/openai";
import { GENERATORS } from "@/lib/ai/generators";
import { hasEnoughCredits } from "@/lib/credits/ledger";
import { resolveSource } from "@/lib/ai/source";
import { isTextTooLong, MAX_PASTED_TEXT_LENGTH } from "@/lib/ai/limits";
import type { GeneratedContentType } from "@/lib/types/database.types";

export const maxDuration = 120;

/**
 * Ne fait que streamer l'objet généré. La persistance en base et le débit de
 * crédits n'ont lieu qu'une fois l'objet complet reçu côté client (voir
 * /api/generated-content), pour ne jamais facturer un flux interrompu.
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
    documentIds?: string[];
    conversationId?: string;
    text?: string;
    questionCount?: 10 | 20 | 50;
    durationMinutes?: number;
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
  const { sourceText } = resolved;

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
  });

  return result.toTextStreamResponse();
}
