import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { feedback } = (await req.json()) as { feedback: "up" | "down" };
  if (feedback !== "up" && feedback !== "down") {
    return Response.json({ error: "INVALID_FEEDBACK" }, { status: 400 });
  }

  // RLS restreint la mise à jour aux messages appartenant à une conversation
  // de l'utilisateur courant (voir messages_update_own).
  const { error } = await supabase.from("messages").update({ feedback }).eq("id", id);
  if (error) {
    console.error("Message feedback update failed", id, error);
    return Response.json({ error: "UPDATE_FAILED" }, { status: 500 });
  }

  return Response.json({ ok: true });
}
