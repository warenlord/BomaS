import Link from "next/link";
import { redirect } from "next/navigation";
import { MessageSquarePlus, MessageSquare, Pin } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getCachedConversations } from "@/lib/chat/queries";
import { groupConversationsByDate } from "@/lib/chat/conversation-groups";
import { listReadyDocuments } from "@/lib/documents/queries";
import { ConversationItem } from "@/components/layout/conversation-item";
import { NewConversationPrompt } from "@/components/chat/new-conversation-prompt";

export default async function ChatHistoryPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const [conversations, documents] = await Promise.all([
    getCachedConversations(user.id),
    listReadyDocuments(supabase, user.id),
  ]);
  const pinned = conversations.filter((c) => c.pinned);
  const groups = groupConversationsByDate(conversations.filter((c) => !c.pinned));
  const firstName = (user.user_metadata?.full_name as string | undefined)?.split(" ")[0];
  const greeting = firstName ? `Qu'est-ce qu'on révise aujourd'hui, ${firstName} ?` : undefined;

  return (
    <>
      {/* Desktop : la sidebar couvre déjà l'historique, donc /chat ouvre
          directement un écran de nouvelle discussion plutôt que de dupliquer
          la liste déjà visible à gauche. */}
      <div className="hidden md:block">
        <NewConversationPrompt greeting={greeting} documents={documents} />
      </div>

      {/* Mobile : pas de sidebar, /chat reste donc le seul moyen de parcourir
          l'historique des discussions. */}
      <div className="mx-auto max-w-3xl px-4 py-6 md:hidden">
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
          <div className="space-y-4">
            {pinned.length > 0 && (
              <div>
                <p className="mb-1.5 flex items-center gap-1 px-1 text-xs font-medium text-muted-foreground">
                  <Pin className="size-3" />
                  Épinglées
                </p>
                <div className="space-y-1 rounded-xl border border-border/60 bg-card p-1.5">
                  {pinned.map((c) => (
                    <ConversationItem key={c.id} conversation={c} />
                  ))}
                </div>
              </div>
            )}

            {groups.map((group) => (
              <div key={group.label}>
                <p className="mb-1.5 px-1 text-xs font-medium text-muted-foreground">{group.label}</p>
                <div className="space-y-1 rounded-xl border border-border/60 bg-card p-1.5">
                  {group.items.map((c) => (
                    <ConversationItem key={c.id} conversation={c} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
