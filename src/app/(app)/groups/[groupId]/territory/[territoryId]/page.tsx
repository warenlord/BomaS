import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getTerritoryClaim } from "@/lib/groups/queries";
import { listReadyDocuments } from "@/lib/documents/queries";
import { qcmSchema } from "@/lib/ai/prompts";
import { QcmTool } from "@/components/tools/qcm-tool";
import { QcmView } from "@/components/tools/qcm-view";
import { Countdown } from "@/components/groups/countdown";

export default async function TerritoryPage({
  params,
}: {
  params: Promise<{ groupId: string; territoryId: string }>;
}) {
  const { groupId, territoryId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const claim = await getTerritoryClaim(supabase, territoryId);
  // On ne rend cette page que pour sa propre réclamation : pas de réclamation
  // d'un autre membre ici, le plateau du groupe suffit pour le reste.
  if (!claim || claim.group_id !== groupId || claim.user_id !== user.id) notFound();

  if (claim.status === "expired") {
    return (
      <SummaryScreen groupId={groupId} title="Délai dépassé">
        <p className="text-sm text-muted-foreground">
          Le délai de 24h pour <strong>{claim.subject}</strong> est passé — cette matière est
          redevenue disponible pour le groupe.
        </p>
      </SummaryScreen>
    );
  }

  if (claim.status === "completed") {
    return (
      <SummaryScreen groupId={groupId} title={`${claim.subject} — conquis`}>
        <p className="mb-1 text-3xl">{"⭐".repeat(claim.stars ?? 0)}</p>
        <p className="text-sm text-muted-foreground">Score : {Math.round(claim.score_percent ?? 0)}%</p>
      </SummaryScreen>
    );
  }

  // in_progress : soit le QCM a déjà été généré (reprise après navigation),
  // soit c'est le premier passage sur cette réclamation. Le lien se retrouve
  // en cherchant côté generated_content (territory_claims ne duplique pas
  // la relation dans l'autre sens).
  const { data: generated } = await supabase
    .from("generated_content")
    .select("id, title, content")
    .eq("territory_claim_id", claim.id)
    .maybeSingle();

  if (generated) {
    const parsed = qcmSchema.safeParse(generated.content);
    if (!parsed.success) notFound();

    const redacted = {
      id: generated.id,
      title: generated.title,
      questions: parsed.data.questions.map((q) => ({ question: q.question, options: q.options })),
    };

    return (
      <div className="mx-auto max-w-3xl px-4 py-6">
        <TerritoryHeader subject={claim.subject} deadlineAt={claim.deadline_at} />
        <QcmView quiz={redacted} />
      </div>
    );
  }

  const documents = await listReadyDocuments(supabase, user.id);

  return (
    <>
      <div className="mx-auto max-w-3xl px-4 pt-6">
        <TerritoryHeader subject={claim.subject} deadlineAt={claim.deadline_at} />
      </div>
      <QcmTool documents={documents} territoryClaimId={claim.id} />
    </>
  );
}

function TerritoryHeader({ subject, deadlineAt }: { subject: string; deadlineAt: string }) {
  return (
    <div className="mb-4 flex items-center justify-between rounded-xl border border-border/60 bg-muted/40 px-4 py-2.5 text-sm">
      <span className="font-medium">{subject}</span>
      <Countdown deadlineAt={deadlineAt} className="text-muted-foreground" />
    </div>
  );
}

function SummaryScreen({ groupId, title, children }: { groupId: string; title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="mb-3 text-lg font-semibold">{title}</h1>
      {children}
      <Link href={`/groups/${groupId}`} className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
        Retour au groupe
      </Link>
    </div>
  );
}
