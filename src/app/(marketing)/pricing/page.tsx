import type { Metadata } from "next";
import { PricingCards } from "@/components/marketing/pricing-cards";
import { CreditCostTable } from "@/components/marketing/credit-cost-table";

export const metadata: Metadata = {
  title: "Tarifs — BomaSchool",
  description: "Découvre les plans d'abonnement et les packs de crédits BomaSchool.",
};

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-4xl font-bold tracking-tight">Des tarifs simples, en FCFA</h1>
        <p className="mt-4 text-muted-foreground">
          Choisis un abonnement mensuel avec un quota de crédits renouvelé chaque mois, ou complète avec un pack de
          crédits ponctuel.
        </p>
      </div>

      <div className="mt-14">
        <PricingCards />
      </div>

      <div className="mt-20">
        <CreditCostTable />
      </div>
    </div>
  );
}
