import { createClient } from "@/lib/supabase/server";
import { GENERATORS } from "@/lib/ai/generators";
import { CREDIT_COSTS } from "@/lib/credits/costs";
import { deductCredits, InsufficientCreditsError } from "@/lib/credits/ledger";
import { listDocuments } from "@/lib/documents/queries";
import type { GeneratedContentType } from "@/lib/types/database.types";

/**
 * Persiste un contenu généré une fois le flux terminé côté client, et débite
 * les crédits correspondants. Le contenu est revalidé contre le schéma
 * attendu : on ne fait jamais confiance à un payload client brut.
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
    type?: string;
    documentIds?: string[];
    content?: unknown;
  };

  const generator = GENERATORS[body.type as GeneratedContentType];
  if (!generator) {
    return Response.json({ error: "UNKNOWN_GENERATOR" }, { status: 404 });
  }

  const parsed = generator.schema.safeParse(body.content);
  if (!parsed.success) {
    return Response.json({ error: "INVALID_CONTENT" }, { status: 400 });
  }

  const documentIds = body.documentIds ?? [];
  let documentTitle: string | null = null;

  if (documentIds.length > 0) {
    const allDocuments = await listDocuments(supabase, user.id);
    const selected = allDocuments.filter((d) => documentIds.includes(d.id));
    if (selected.length !== documentIds.length) {
      return Response.json({ error: "DOCUMENT_NOT_FOUND" }, { status: 404 });
    }
    documentTitle = selected.length === 1 ? selected[0].title : `${selected.length} documents`;
  }

  const title = (parsed.data as { title?: string }).title?.trim() || documentTitle || "Contenu généré";

  const { data: saved, error: insertError } = await supabase
    .from("generated_content")
    .insert({
      user_id: user.id,
      document_id: documentIds[0] ?? null,
      document_ids: documentIds,
      type: body.type as GeneratedContentType,
      title,
      content: parsed.data,
      credits_used: CREDIT_COSTS[generator.feature],
    })
    .select("id")
    .single();

  if (insertError || !saved) {
    return Response.json({ error: "DB_INSERT_FAILED" }, { status: 500 });
  }

  try {
    await deductCredits(supabase, user.id, generator.feature, { referenceId: saved.id });
  } catch (err) {
    if (err instanceof InsufficientCreditsError) {
      return Response.json({ id: saved.id, warning: "INSUFFICIENT_CREDITS_NOT_CHARGED" });
    }
    throw err;
  }

  return Response.json({ id: saved.id });
}
