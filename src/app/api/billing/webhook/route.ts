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

  // Idempotence : les passerelles de paiement renvoient parfois le même
  // webhook plusieurs fois (retry sur timeout), et la référence d'un paiement
  // réussi peut aussi être rejouée manuellement. Si ce paiement était déjà
  // marqué "success" avant cet appel, on ne réattribue rien une deuxième
  // fois — sinon un simple replay reccrédite indéfiniment le compte.
  const alreadyProcessed = payment.status === "success";

  const { error: updateError } = await supabase
    .from("payments")
    .update({
      status: verification.status,
      provider_transaction_id: verification.providerTransactionId,
      raw_payload: verification.rawPayload as never,
    })
    .eq("id", payment.id);

  if (updateError) {
    console.error("Payment status update failed", payment.id, updateError);
  }

  if (verification.status === "success" && !alreadyProcessed) {
    if (payment.kind === "subscription" && payment.plan_id) {
      const { data: plan } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("id", payment.plan_id)
        .single();

      if (plan) {
        const periodStart = new Date().toISOString();
        const periodEnd = new Date(Date.now() + THIRTY_DAYS_MS).toISOString();

        const { error: subError } = await supabase
          .from("user_subscriptions")
          .update({
            plan_id: plan.id,
            status: "active",
            current_period_start: periodStart,
            current_period_end: periodEnd,
          })
          .eq("user_id", payment.user_id);
        if (subError) console.error("Subscription activation failed", payment.id, subError);

        const { error: walletError } = await supabase
          .from("credit_wallets")
          .update({
            balance: plan.monthly_credits,
            monthly_allowance: plan.monthly_credits,
            period_start: periodStart,
            period_end: periodEnd,
          })
          .eq("user_id", payment.user_id);
        if (walletError) console.error("Credit wallet reset failed", payment.id, walletError);

        const { error: txError } = await supabase.from("credit_transactions").insert({
          user_id: payment.user_id,
          amount: plan.monthly_credits,
          balance_after: plan.monthly_credits,
          type: "subscription_renewal",
          reference_id: payment.id,
          description: `Changement de plan vers ${plan.name}`,
        });
        if (txError) console.error("Credit transaction log failed", payment.id, txError);
      }
    } else if (payment.kind === "credit_pack" && payment.credit_pack_id) {
      const { data: pack } = await supabase
        .from("credit_packs")
        .select("*")
        .eq("id", payment.credit_pack_id)
        .single();

      if (pack) {
        const { error: creditError } = await supabase.rpc("add_credits", {
          p_user_id: payment.user_id,
          p_amount: pack.credits,
          p_type: "purchase",
          p_reference_id: payment.id,
          p_description: `Achat ${pack.name}`,
        });
        if (creditError) console.error("Credit pack grant failed", payment.id, creditError);
      }
    }
  }

  return Response.json({ ok: true });
}
