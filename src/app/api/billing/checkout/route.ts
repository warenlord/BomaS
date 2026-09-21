import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { singpayProvider } from "@/lib/billing/singpay";
import { PLANS, CREDIT_PACKS } from "@/lib/billing/plans";
import type { CreditPackCode, SubscriptionPlanCode } from "@/lib/types/database.types";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = (await req.json()) as {
    kind: "subscription" | "credit_pack";
    planCode?: string;
    packCode?: string;
  };
  const { kind } = body;
  const planCode = PLANS.some((p) => p.code === body.planCode) ? (body.planCode as SubscriptionPlanCode) : undefined;
  const packCode = CREDIT_PACKS.some((p) => p.code === body.packCode)
    ? (body.packCode as CreditPackCode)
    : undefined;

  let amountFcfa = 0;
  let description = "";
  let planId: string | null = null;
  let packId: string | null = null;

  if (kind === "subscription" && planCode) {
    const { data: plan } = await supabase.from("subscription_plans").select("*").eq("code", planCode).single();
    if (!plan) return Response.json({ error: "PLAN_NOT_FOUND" }, { status: 404 });
    amountFcfa = plan.price_fcfa;
    description = `Abonnement BomaSchool - ${plan.name}`;
    planId = plan.id;
  } else if (kind === "credit_pack" && packCode) {
    const { data: pack } = await supabase.from("credit_packs").select("*").eq("code", packCode).single();
    if (!pack) return Response.json({ error: "PACK_NOT_FOUND" }, { status: 404 });
    amountFcfa = pack.price_fcfa;
    description = `Pack de crédits BomaSchool - ${pack.name}`;
    packId = pack.id;
  } else {
    return Response.json({ error: "INVALID_KIND" }, { status: 400 });
  }

  const reference = `bs_${randomUUID()}`;

  const { error: insertError } = await supabase.from("payments").insert({
    user_id: user.id,
    provider: "singpay",
    kind,
    plan_id: planId,
    credit_pack_id: packId,
    reference,
    amount_fcfa: amountFcfa,
    status: "pending",
  });

  if (insertError) {
    return Response.json({ error: "DB_INSERT_FAILED" }, { status: 500 });
  }

  if (!singpayProvider.isConfigured()) {
    return Response.json({
      configured: false,
      message:
        "Le paiement SingPay n'est pas encore configuré sur cette instance. Contacte l'administrateur pour activer les paiements.",
    });
  }

  try {
    const { checkoutUrl } = await singpayProvider.initPayment({
      reference,
      amountFcfa,
      description,
      customerEmail: user.email ?? "",
      returnUrl: `${process.env.NEXT_PUBLIC_APP_URL}/billing?payment=pending`,
    });
    return Response.json({ configured: true, checkoutUrl });
  } catch {
    return Response.json({ error: "SINGPAY_INIT_FAILED" }, { status: 500 });
  }
}
