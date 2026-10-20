import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { JoinGroupCard } from "@/components/groups/join-group-card";

export default async function JoinGroupPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/groups/join/${code}`)}`);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_group_preview", { p_invite_code: code });
  if (error) console.error("get_group_preview failed", code, error);
  const preview = !error ? (data?.[0] ?? null) : null;

  if (!preview || !preview.group_id) {
    return (
      <div className="mx-auto max-w-sm px-4 py-16 text-center">
        <h1 className="mb-2 text-lg font-semibold">Code d&apos;invitation invalide</h1>
        <p className="text-sm text-muted-foreground">
          Ce code ne correspond à aucun groupe. Vérifie le lien ou demande-en un nouveau.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <JoinGroupCard
        inviteCode={code}
        groupName={preview.name}
        memberCount={preview.member_count}
      />
    </div>
  );
}
