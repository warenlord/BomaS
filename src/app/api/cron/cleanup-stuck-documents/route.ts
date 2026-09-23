import { createAdminClient } from "@/lib/supabase/admin";
import { addCredits } from "@/lib/credits/ledger";

const STUCK_THRESHOLD_MINUTES = 10;

/**
 * Filet de sécurité : un document peut rester bloqué en "processing" si la
 * fonction serverless est tuée en plein traitement (timeout Vercel, crash) —
 * dans ce cas, ni le catch applicatif ni le remboursement ne s'exécutent
 * (voir /api/documents/process). Ce cron repère ces documents fantômes,
 * rembourse les crédits déjà débités s'il y en a, et les marque en erreur
 * pour que l'étudiant ne reste pas devant un import qui ne finira jamais.
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const threshold = new Date(Date.now() - STUCK_THRESHOLD_MINUTES * 60 * 1000).toISOString();

  const { data: stuckDocuments, error } = await supabase
    .from("documents")
    .select("id, user_id, title")
    .eq("status", "processing")
    .lt("updated_at", threshold);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  let refunded = 0;
  for (const doc of stuckDocuments ?? []) {
    const { data: transaction } = await supabase
      .from("credit_transactions")
      .select("amount")
      .eq("reference_id", doc.id)
      .eq("feature", "document_analysis")
      .eq("type", "usage")
      .maybeSingle();

    if (transaction) {
      await addCredits(supabase, doc.user_id, Math.abs(transaction.amount), "refund", {
        referenceId: doc.id,
        description: `Remboursement : traitement de "${doc.title}" interrompu`,
      });
      refunded += 1;
    }

    await supabase
      .from("documents")
      .update({ status: "error", error_message: "Le traitement a pris trop de temps et a été interrompu." })
      .eq("id", doc.id);
  }

  return Response.json({ cleaned: stuckDocuments?.length ?? 0, refunded });
}
