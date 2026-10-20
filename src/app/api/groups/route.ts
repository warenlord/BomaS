import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { name } = (await req.json()) as { name?: string };
  const trimmed = name?.trim();
  if (!trimmed) {
    return Response.json({ error: "NAME_REQUIRED" }, { status: 400 });
  }

  const { data, error } = await supabase.rpc("create_study_group", { p_name: trimmed });
  if (error || !data?.[0]) {
    console.error("create_study_group failed", error);
    return Response.json({ error: "CREATE_FAILED" }, { status: 500 });
  }

  const { group_id: groupId, invite_code: inviteCode } = data[0];
  return Response.json({ groupId, inviteCode });
}
