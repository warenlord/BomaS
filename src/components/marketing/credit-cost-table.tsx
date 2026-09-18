import { CREDIT_COSTS, CREDIT_FEATURE_LABELS } from "@/lib/credits/costs";
import { CREDIT_PACKS } from "@/lib/billing/plans";
import { formatFcfa, formatCredits } from "@/lib/format";

export function CreditCostTable() {
  const features = Object.keys(CREDIT_COSTS) as (keyof typeof CREDIT_COSTS)[];

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
      <div className="rounded-2xl border border-border/60 bg-card p-6">
        <h3 className="font-semibold">Coût des actions en crédits</h3>
        <ul className="mt-4 divide-y divide-border/60 text-sm">
          {features.map((feature) => (
            <li key={feature} className="flex items-center justify-between py-2.5">
              <span className="text-muted-foreground">{CREDIT_FEATURE_LABELS[feature]}</span>
              <span className="font-medium">{CREDIT_COSTS[feature]} crédit{CREDIT_COSTS[feature] > 1 ? "s" : ""}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-2xl border border-border/60 bg-card p-6">
        <h3 className="font-semibold">Packs de crédits ponctuels</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          À acheter à tout moment en complément de ton abonnement.
        </p>
        <ul className="mt-4 space-y-3">
          {CREDIT_PACKS.map((pack) => (
            <li
              key={pack.code}
              className="flex items-center justify-between rounded-xl border border-border/60 px-4 py-3 text-sm"
            >
              <div>
                <p className="font-medium">{pack.name}</p>
                <p className="text-muted-foreground">{formatCredits(pack.credits)} crédits</p>
              </div>
              <span className="font-semibold">{formatFcfa(pack.priceFcfa)}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
