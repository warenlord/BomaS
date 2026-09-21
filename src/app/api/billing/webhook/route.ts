import { createAdminClient } from "@/lib/supabase/admin";
import { singpayProvider } from "@/lib/billing/singpay";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export async function POST(req: Request) {
  const rawBody = await req.text();
  const verification = await singpayProvider.verifyWebhook(rawBody, req.headers);

  if (!verification.isValid) {
    return Response.json({ error: "VERIFICATION_FAILED" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const { data: payment } = await supabase
    .from("payments")
    .select("*")
    .eq("reference", verification.reference)
    .single();

  if (!payment) {
    return Response.json({ error: "PAYMENT_NOT_FOUND" }, { status: 404 });
  }

  await supabase
    .from("payments")
    .update({
      status: verification.status,
      provider_transaction_id: verification.providerTransactionId,
      raw_payload: verification.rawPayload as never,
    })
    .eq("id", payment.id);

  if (verification.status === "success") {
    if (payment.kind === "subscription" && payment.plan_id) {
      const { data: plan } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("id", payment.plan_id)
        .single();

      if (plan) {
        const periodStart = new Date().toISOString();
        const periodEnd = new Date(Date.now() + THIRTY_DAYS_MS).toISOString();

        await supabase
          .from("user_subscriptions")
          .update({
            plan_id: plan.id,
            status: "active",
            current_period_start: periodStart,
            current_period_end: periodEnd,
          })
          .eq("user_id", payment.user_id);

        await supabase
          .from("credit_wallets")
          .update({
            balance: plan.monthly_credits,
            monthly_allowance: plan.monthly_credits,
            period_start: periodStart,
            period_end: periodEnd,
          })
          .eq("user_id", payment.user_id);

        await supabase.from("credit_transactions").insert({
          user_id: payment.user_id,
          amount: plan.monthly_credits,
          balance_after: plan.monthly_credits,
          type: "subscription_renewal",
          reference_id: payment.id,
          description: `Changement de plan vers ${plan.name}`,
        });
      }
    } else if (payment.kind === "credit_pack" && payment.credit_pack_id) {
      const { data: pack } = await supabase
        .from("credit_packs")
        .select("*")
        .eq("id", payment.credit_pack_id)
        .single();

      if (pack) {
        await supabase.rpc("add_credits", {
          p_user_id: payment.user_id,
          p_amount: pack.credits,
          p_type: "purchase",
          p_reference_id: payment.id,
          p_description: `Achat ${pack.name}`,
        });
      }
    }
  }

  return Response.json({ ok: true });
}
