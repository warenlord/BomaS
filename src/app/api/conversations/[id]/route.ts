import { createClient } from "@/lib/supabase/server";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = (await req.json()) as { title?: string; pinned?: boolean };
  const update: { title?: string; pinned?: boolean } = {};
  if (typeof body.title === "string" && body.title.trim()) update.title = body.title.trim().slice(0, 80);
  if (typeof body.pinned === "boolean") update.pinned = body.pinned;

  if (Object.keys(update).length === 0) {
    return Response.json({ error: "NO_CHANGES" }, { status: 400 });
  }

  const { error } = await supabase.from("conversations").update(update).eq("id", id).eq("user_id", user.id);
  if (error) {
    console.error("Conversation update failed", id, error);
    return Response.json({ error: "UPDATE_FAILED" }, { status: 500 });
  }

  return Response.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { error } = await supabase.from("conversations").delete().eq("id", id).eq("user_id", user.id);
  if (error) {
    console.error("Conversation delete failed", id, error);
    return Response.json({ error: "DELETE_FAILED" }, { status: 500 });
  }

  return Response.json({ ok: true });
}
