import { createClient } from "@/lib/supabase/server";

const ERROR_STATUS: Record<string, number> = {
  NOT_FOUND: 404,
  GROUP_FULL: 409,
};

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { inviteCode } = (await req.json()) as { inviteCode?: string };
  if (!inviteCode?.trim()) {
    return Response.json({ error: "INVITE_CODE_REQUIRED" }, { status: 400 });
  }

  const { data, error } = await supabase.rpc("join_group", { p_invite_code: inviteCode.trim() });
  if (error || !data?.[0]) {
    console.error("join_group failed", error);
    return Response.json({ error: "JOIN_FAILED" }, { status: 500 });
  }

  const { group_id: groupId, reason } = data[0];
  if (reason !== "OK" && reason !== "ALREADY_MEMBER") {
    return Response.json({ error: reason }, { status: ERROR_STATUS[reason] ?? 400 });
  }

  return Response.json({ groupId });
}
