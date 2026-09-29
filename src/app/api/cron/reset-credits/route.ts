import { createAdminClient } from "@/lib/supabase/admin";
import { isAuthorizedCronRequest } from "@/lib/cron/auth";

/**
 * Appelé quotidiennement par le cron Vercel (voir vercel.json). Renouvelle le
 * quota de crédits de tous les portefeuilles dont la période est échue.
 */
export async function GET(req: Request) {
  if (!isAuthorizedCronRequest(req)) {
    return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("reset_due_credit_wallets");

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ renewed: data });
}
