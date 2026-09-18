import { createClient } from "@/lib/supabase/server";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { data: document } = await supabase.from("documents").select("*").eq("id", id).single();
  if (!document || document.user_id !== user.id) {
    return Response.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  await supabase.storage.from("documents").remove([document.file_path]);
  const { error } = await supabase.from("documents").delete().eq("id", id);

  if (error) {
    return Response.json({ error: "DELETE_FAILED" }, { status: 500 });
  }

  return Response.json({ ok: true });
}
