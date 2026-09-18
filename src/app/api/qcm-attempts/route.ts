import { createClient } from "@/lib/supabase/server";
import type { QcmContent } from "@/lib/ai/prompts";

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

  const content = generated.content as QcmContent;
  const total = content.questions.length;
  const score = content.questions.reduce(
    (acc, question, i) => (answers[i] === question.correctIndex ? acc + 1 : acc),
    0,
  );

  const { error: insertError } = await supabase.from("qcm_attempts").insert({
    generated_content_id: generatedContentId,
    user_id: user.id,
    score,
    total,
    answers,
  });

  if (insertError) {
    return Response.json({ error: "DB_INSERT_FAILED" }, { status: 500 });
  }

  return Response.json({ score, total });
}
