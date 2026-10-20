import { createAdminClient } from "@/lib/supabase/admin";
import { isAuthorizedCronRequest } from "@/lib/cron/auth";

/**
 * Bascule en "expired" toute réclamation de territoire dont le délai de 24h
 * est dépassé, ce qui la rend à nouveau réclamable par un autre membre du
 * groupe. La bascule de statut se fait EN MÊME TEMPS que la sélection (un
 * seul UPDATE ... WHERE status = 'in_progress' ... RETURNING), comme pour
 * cleanup-stuck-documents : une exécution qui chevauche la précédente ne
 * peut pas retrouver la même ligne encore "in_progress" et la traiter deux fois.
 */
export async function GET(req: Request) {
  if (!isAuthorizedCronRequest(req)) {
    return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("territory_claims")
    .update({ status: "expired" })
    .eq("status", "in_progress")
    .lt("deadline_at", new Date().toISOString())
    .select("id");

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ expired: data?.length ?? 0 });
}
