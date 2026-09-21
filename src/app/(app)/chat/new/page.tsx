import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/session";
import { createConversation } from "@/lib/chat/queries";

export default async function NewChatPage({
  searchParams,
}: {
  searchParams: Promise<{ documentId?: string; prompt?: string }>;
}) {
  const { documentId, prompt } = await searchParams;

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const conversation = await createConversation(supabase, user.id, documentId);
  const query = prompt ? `?autoSend=${encodeURIComponent(prompt)}` : "";
  redirect(`/chat/${conversation.id}${query}`);
}
