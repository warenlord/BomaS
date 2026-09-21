import { createClient } from "@/lib/supabase/server";
import type { ExamContent } from "@/lib/ai/prompts";

/**
 * Corrige un examen blanc côté serveur, une fois les réponses de l'étudiant
 * soumises. Contrairement au QCM, il n'y a pas de table d'historique dédiée :
 * la correction est calculée à la volée à partir du contenu déjà persisté
 * dans generated_content, sans nouvelle écriture en base.
 */
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
    answers: (number | null)[];
  };

  const { data: generated, error } = await supabase
    .from("generated_content")
    .select("*")
    .eq("id", generatedContentId)
    .eq("user_id", user.id)
    .eq("type", "exam")
    .single();

  if (error || !generated) {
    return Response.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const content = generated.content as ExamContent;

  let score = 0;
  let totalQcmPoints = 0;
  let totalPoints = 0;

  for (const q of content.questions) {
    totalPoints += q.points;
    if (q.type === "qcm") {
      totalQcmPoints += q.points;
    }
  }

  const corrections = content.questions.map((q, i) => {
    if (q.type === "qcm" && answers[i] === q.correctIndex) {
      score += q.points;
    }
    return {
      type: q.type,
      correctIndex: q.correctIndex,
      modelAnswer: q.modelAnswer,
      points: q.points,
    };
  });

  return Response.json({ score, totalQcmPoints, totalPoints, corrections });
}
