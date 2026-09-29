import { createAdminClient } from "@/lib/supabase/admin";
import { addCredits } from "@/lib/credits/ledger";
import { isAuthorizedCronRequest } from "@/lib/cron/auth";

const STUCK_THRESHOLD_MINUTES = 20;
const REFUNDABLE_FEATURES = ["qcm", "exam", "memoire_analysis"] as const;

/**
 * Filet de sécurité pour QCM/examen/analyse de mémoire, équivalent à
 * cleanup-stuck-documents mais pour ces trois générateurs : leurs crédits
 * sont débités AVANT l'appel au modèle (voir leurs routes dédiées), et
 * remboursés dans leur `catch` en cas d'échec — mais un timeout plateforme
 * (fonction tuée en plein generateObject, notamment pour un mémoire volumineux
 * avec maxDuration=300s) tue le processus avant que ce catch ne s'exécute.
 *
 * Contrairement aux documents (qui ont un statut "processing" à réclamer
 * atomiquement), les transactions de crédit n'ont pas de champ de statut : on
 * évite les remboursements en double en vérifiant, pour chaque transaction
 * candidate, qu'aucun remboursement ne référence déjà le même contentId
 * (reference_id partagé entre la transaction "usage" et son remboursement).
 */
export async function GET(req: Request) {
  if (!isAuthorizedCronRequest(req)) {
    return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const threshold = new Date(Date.now() - STUCK_THRESHOLD_MINUTES * 60 * 1000).toISOString();

  const { data: candidates, error } = await supabase
    .from("credit_transactions")
    .select("id, user_id, reference_id, amount, feature")
    .eq("type", "usage")
    .in("feature", REFUNDABLE_FEATURES)
    .not("reference_id", "is", null)
    .lt("created_at", threshold);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  let refunded = 0;
  for (const tx of candidates ?? []) {
    const contentId = tx.reference_id!;

    const { data: content } = await supabase
      .from("generated_content")
      .select("id")
      .eq("id", contentId)
      .maybeSingle();
    if (content) continue; // La génération a bien abouti, rien à faire.

    const { data: existingRefund } = await supabase
      .from("credit_transactions")
      .select("id")
      .eq("reference_id", contentId)
      .eq("type", "refund")
      .maybeSingle();
    if (existingRefund) continue; // Déjà remboursé par un précédent passage.

    await addCredits(supabase, tx.user_id, Math.abs(tx.amount), "refund", {
      referenceId: contentId,
      description: `Remboursement : génération "${tx.feature}" interrompue`,
    });
    refunded += 1;
  }

  return Response.json({ checked: candidates?.length ?? 0, refunded });
}
