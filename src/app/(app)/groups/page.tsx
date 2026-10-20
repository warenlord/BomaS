import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { listUserGroups } from "@/lib/groups/queries";
import { GroupList } from "@/components/groups/group-list";

export default async function GroupsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const groups = await listUserGroups(supabase, user.id);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold">Révision collective</h1>
        <p className="text-sm text-muted-foreground">
          Rejoins un groupe de révision et affrontez ensemble le programme, une matière à la fois.
        </p>
      </div>

      <GroupList groups={groups} />
    </div>
  );
}
