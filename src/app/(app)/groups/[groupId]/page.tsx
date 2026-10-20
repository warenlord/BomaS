import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getGroupById, getGroupMembers, getTerritoryBoard } from "@/lib/groups/queries";
import { TerritoryBoard } from "@/components/groups/territory-board";
import { InviteCodeCard } from "@/components/groups/invite-code-card";

export default async function GroupPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  // getGroupById s'appuie sur la policy RLS "membre uniquement" : un non-membre
  // reçoit null ici, pas une erreur — donc notFound() couvre les deux cas
  // (groupe inexistant, ou existant mais dont on n'est pas membre).
  const group = await getGroupById(supabase, groupId);
  if (!group) notFound();

  const [board, members] = await Promise.all([
    getTerritoryBoard(supabase, groupId),
    getGroupMembers(supabase, groupId),
  ]);

  const nameById = new Map(members.map((m) => [m.userId, m.fullName]));

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">{group.name}</h1>
          <p className="text-sm text-muted-foreground">
            {members.length} membre{members.length > 1 ? "s" : ""} · 11 matières à conquérir
          </p>
        </div>
        <InviteCodeCard inviteCode={group.invite_code} />
      </div>

      <TerritoryBoard groupId={groupId} board={board} currentUserId={user.id} nameById={Object.fromEntries(nameById)} />
    </div>
  );
}
