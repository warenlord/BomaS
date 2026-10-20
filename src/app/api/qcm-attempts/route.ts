import { createClient } from "@/lib/supabase/server";
import { qcmSchema } from "@/lib/ai/prompts";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { generatedContentId, answers } = (await req.json()) as {
    generatedContentId: string;
    answers: number[];
  };

  const { data: generated, error } = await supabase
    .from("generated_content")
    .select("*")
    .eq("id", generatedContentId)
    .eq("user_id", user.id)
    .eq("type", "qcm")
    .single();

  if (error || !generated) {
    return Response.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const parsed = qcmSchema.safeParse(generated.content);
  if (!parsed.success) {
    console.error("Stored QCM content failed validation", generatedContentId, parsed.error);
    return Response.json({ error: "INVALID_CONTENT" }, { status: 500 });
  }
  const content = parsed.data;
  const total = content.questions.length;
  const score = content.questions.reduce(
    (acc, question, i) => (answers[i] === question.correctIndex ? acc + 1 : acc),
    0,
  );

  const { data: attempt, error: insertError } = await supabase
    .from("qcm_attempts")
    .insert({
      generated_content_id: generatedContentId,
      user_id: user.id,
      score,
      total,
      answers,
    })
    .select("id")
    .single();

  if (insertError || !attempt) {
    console.error("QCM attempt insert failed", generatedContentId, insertError);
    return Response.json({ error: "DB_INSERT_FAILED" }, { status: 500 });
  }

  // Le corrigé (bonne réponse + explication) n'est renvoyé qu'ici, une fois
  // les réponses de l'étudiant déjà soumises et notées côté serveur.
  const corrections = content.questions.map((q) => ({
    correctIndex: q.correctIndex,
    explanation: q.explanation,
  }));

  // Révision collective : si ce QCM provient d'une réclamation de
  // territoire, on la clôture ici. Le RPC revérifie lui-même le délai
  // (indépendamment du cron d'expiration) et verrouille la ligne pour
  // qu'une double soumission ne compte jamais deux fois.
  let territoryResult: { counted: boolean; reason: string; stars: number | null } | null = null;
  // Distingue un échec RPC réel (ex: coupure DB passagère) d'un simple refus
  // métier (DEADLINE_PASSED, ALREADY_RESOLVED...) : dans le premier cas, le
  // score est bien enregistré mais le territoire reste "in_progress" sans
  // qu'on le sache — le client doit pouvoir le signaler plutôt que de
  // silencieusement n'afficher aucune bannière de territoire.
  let territoryError = false;
  if (generated.territory_claim_id) {
    const { data: result, error: rpcError } = await supabase.rpc("complete_territory_claim", {
      p_claim_id: generated.territory_claim_id,
      p_qcm_attempt_id: attempt.id,
      p_score_percent: (score / total) * 100,
    });
    if (rpcError) {
      console.error("complete_territory_claim failed", generated.territory_claim_id, rpcError);
      territoryError = true;
    } else {
      territoryResult = result?.[0] ?? null;
    }
  }

  return Response.json({ score, total, corrections, territoryResult, territoryError });
}
