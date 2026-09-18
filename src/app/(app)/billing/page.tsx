import { redirect } from "next/navigation";
import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import { getUsageStats } from "@/lib/credits/ledger";
import { getUserSubscription } from "@/lib/billing/subscription";
import { PLANS, CREDIT_PACKS } from "@/lib/billing/plans";
import { CreditMeter } from "@/components/credits/credit-meter";
import { CheckoutButton } from "@/components/billing/checkout-button";
import { formatFcfa, formatCredits, formatDateShort } from "@/lib/format";
import { cn } from "@/lib/utils";

export default async function BillingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [stats, { plan, subscription }] = await Promise.all([
    getUsageStats(supabase, user.id),
    getUserSubscription(supabase, user.id),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="mb-1 text-xl font-semibold">Abonnement & crédits</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Plan {plan.name} · renouvellement le {formatDateShort(subscription.current_period_end)}
      </p>

      <div className="mb-10 rounded-2xl border border-border/60 bg-card p-5">
        <CreditMeter stats={stats} />
      </div>

      <h2 className="mb-4 text-lg font-semibold">Changer de plan</h2>
      <div className="mb-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PLANS.map((p) => {
          const isCurrent = p.code === plan.code;
          return (
            <div
              key={p.code}
              className={cn(
                "relative flex flex-col rounded-2xl border p-5",
                isCurrent ? "border-primary ring-1 ring-primary" : "border-border/60 bg-card",
              )}
            >
              {isCurrent && (
                <Badge className="absolute -top-3 left-5 bg-primary text-primary-foreground">Plan actuel</Badge>
              )}
              <h3 className="font-semibold">{p.name}</h3>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-2xl font-bold">{p.priceFcfa === 0 ? "Gratuit" : formatFcfa(p.priceFcfa)}</span>
                {p.priceFcfa > 0 && <span className="text-xs text-muted-foreground">/mois</span>}
              </div>
              <ul className="mt-4 space-y-2 text-xs">
                <li className="flex items-center gap-1.5">
                  <Check className="size-3.5 text-primary" />
                  {formatCredits(p.monthlyCredits)} crédits/mois
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="size-3.5 text-primary" />
                  {p.maxPdfs ? `${p.maxPdfs} PDF max` : "PDF illimités"}
                </li>
              </ul>
              <div className="mt-4">
                {isCurrent ? (
                  <p className="rounded-lg bg-muted px-3 py-2 text-center text-xs text-muted-foreground">
                    Ton plan actuel
                  </p>
                ) : (
                  <CheckoutButton kind="subscription" code={p.code} label="Choisir ce plan" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      <h2 className="mb-4 text-lg font-semibold">Packs de crédits ponctuels</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {CREDIT_PACKS.map((pack) => (
          <div key={pack.code} className="flex flex-col rounded-2xl border border-border/60 bg-card p-5">
            <h3 className="font-semibold">{pack.name}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{formatCredits(pack.credits)} crédits</p>
            <p className="mt-2 text-2xl font-bold">{formatFcfa(pack.priceFcfa)}</p>
            <div className="mt-4">
              <CheckoutButton kind="credit_pack" code={pack.code} label="Acheter" variant="outline" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
