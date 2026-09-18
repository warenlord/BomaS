import Link from "next/link";
import { redirect } from "next/navigation";
import { MessageSquarePlus, MessageSquare, FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { listConversations } from "@/lib/chat/queries";
import { formatDateShort } from "@/lib/format";

export default async function ChatHistoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const conversations = await listConversations(supabase, user.id);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Conversations</h1>
        <Link
          href="/chat/new"
          className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
        >
          <MessageSquarePlus className="size-4" />
          Nouvelle conversation
        </Link>
      </div>

      {conversations.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border py-16 text-center text-muted-foreground">
          <MessageSquare className="size-8" />
          <p className="text-sm">Aucune conversation pour le moment.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {conversations.map((c) => (
            <li key={c.id}>
              <Link
                href={`/chat/${c.id}`}
                className="flex items-center justify-between rounded-xl border border-border/60 bg-card px-4 py-3 transition-colors hover:bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  {c.document_id ? (
                    <FileText className="size-4 shrink-0 text-primary" />
                  ) : (
                    <MessageSquare className="size-4 shrink-0 text-muted-foreground" />
                  )}
                  <span className="line-clamp-1 text-sm font-medium">{c.title}</span>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">{formatDateShort(c.updated_at)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
