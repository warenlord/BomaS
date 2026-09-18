import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PLANS } from "@/lib/billing/plans";
import { formatFcfa, formatCredits } from "@/lib/format";
import { cn } from "@/lib/utils";

export function PricingCards() {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {PLANS.map((plan) => (
        <div
          key={plan.code}
          className={cn(
            "relative flex flex-col rounded-2xl border p-6 shadow-sm",
            plan.highlight ? "border-primary bg-primary/[0.03] ring-1 ring-primary" : "border-border/60 bg-card",
          )}
        >
          {plan.highlight && (
            <Badge className="absolute -top-3 left-6 bg-primary text-primary-foreground">Le plus populaire</Badge>
          )}
          <h3 className="font-semibold">{plan.name}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>

          <div className="mt-4 flex items-baseline gap-1">
            <span className="text-3xl font-bold tracking-tight">
              {plan.priceFcfa === 0 ? "Gratuit" : formatFcfa(plan.priceFcfa)}
            </span>
            {plan.priceFcfa > 0 && <span className="text-sm text-muted-foreground">/mois</span>}
          </div>

          <ul className="mt-6 space-y-3 text-sm">
            <li className="flex items-start gap-2">
              <Check className="mt-0.5 size-4 shrink-0 text-primary" />
              <span>{formatCredits(plan.monthlyCredits)} crédits par mois</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="mt-0.5 size-4 shrink-0 text-primary" />
              <span>{plan.maxPdfs ? `${plan.maxPdfs} PDF maximum` : "PDF illimités"}</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="mt-0.5 size-4 shrink-0 text-primary" />
              <span>{plan.hasAds ? "Publicité légère" : "Sans publicité"}</span>
            </li>
          </ul>

          <Button
            className="mt-8"
            variant={plan.highlight ? "default" : "outline"}
            render={
              <Link href="/signup">
                {plan.priceFcfa === 0 ? "Commencer gratuitement" : "Choisir ce plan"}
              </Link>
            }
          />
        </div>
      ))}
    </div>
  );
}
