import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FeatureGrid } from "@/components/marketing/feature-grid";
import { PricingCards } from "@/components/marketing/pricing-cards";

export default function LandingPage() {
  return (
    <>
      <section className="relative overflow-hidden">
        <div className="mx-auto flex max-w-6xl flex-col items-center px-4 py-20 text-center sm:px-6 sm:py-28">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
            <Sparkles className="size-3.5 text-primary" />
            Fait pour les étudiants du Gabon
          </div>

          <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-balance sm:text-6xl">
            L&apos;assistant IA qui révise <span className="text-primary">avec toi</span>
          </h1>

          <p className="mt-6 max-w-xl text-lg text-muted-foreground text-balance">
            Chat IA, analyse de tes PDF de cours, QCM, fiches de révision et examens blancs générés en quelques
            secondes. BomaSchool t&apos;accompagne du premier cours jusqu&apos;au jour de l&apos;examen.
          </p>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Button
              size="lg"
              render={
                <Link href="/signup">
                  Commencer gratuitement
                  <ArrowRight className="size-4" />
                </Link>
              }
            />
            <Button size="lg" variant="outline" render={<Link href="/pricing">Voir les tarifs</Link>} />
          </div>

          <p className="mt-4 text-sm text-muted-foreground">
            50 crédits offerts chaque mois, sans carte bancaire.
          </p>
        </div>
      </section>

      <FeatureGrid />

      <section className="border-t border-border/60 bg-muted/30 py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Un plan pour chaque besoin</h2>
            <p className="mt-4 text-muted-foreground">
              Commence gratuitement, passe au plan supérieur quand tu veux. Sans engagement.
            </p>
          </div>
          <div className="mt-12">
            <PricingCards />
          </div>
        </div>
      </section>
    </>
  );
}
