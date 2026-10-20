import { createClient } from "@/lib/supabase/server";
import { SUBJECTS } from "@/lib/documents/subjects";

const ERROR_STATUS: Record<string, number> = {
  NOT_A_MEMBER: 403,
  ALREADY_CLAIMED: 409,
};

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { groupId, subject } = (await req.json()) as { groupId?: string; subject?: string };
  if (!groupId || !subject || !SUBJECTS.includes(subject as (typeof SUBJECTS)[number])) {
    return Response.json({ error: "INVALID_SUBJECT" }, { status: 400 });
  }

  const { data, error } = await supabase.rpc("claim_territory", { p_group_id: groupId, p_subject: subject });
  if (error || !data?.[0]) {
    console.error("claim_territory failed", error);
    return Response.json({ error: "CLAIM_FAILED" }, { status: 500 });
  }

  const { claim_id: claimId, deadline_at: deadlineAt, reason } = data[0];
  if (reason !== "OK") {
    return Response.json({ error: reason }, { status: ERROR_STATUS[reason] ?? 400 });
  }

  return Response.json({ claimId, deadlineAt });
}
