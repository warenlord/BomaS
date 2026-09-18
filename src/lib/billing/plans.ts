import type { CreditPackCode, SubscriptionPlanCode } from "@/lib/types/database.types";

/**
 * Miroir statique de `subscription_plans` / `credit_packs` (voir
 * `supabase/migrations/0001_init.sql`), utilisé pour l'affichage public
 * (landing, pricing) sans dépendre d'une connexion à la base de données.
 * La source de vérité pour la facturation reste toujours la base Supabase.
 */
export interface PlanDefinition {
  code: SubscriptionPlanCode;
  name: string;
  priceFcfa: number;
  monthlyCredits: number;
  maxPdfs: number | null;
  hasAds: boolean;
  highlight?: boolean;
  description: string;
}

export const PLANS: PlanDefinition[] = [
  {
    code: "free",
    name: "Gratuit",
    priceFcfa: 0,
    monthlyCredits: 50,
    maxPdfs: 3,
    hasAds: true,
    description: "Pour découvrir BomaSchool",
  },
  {
    code: "etudiant",
    name: "Étudiant",
    priceFcfa: 3000,
    monthlyCredits: 1000,
    maxPdfs: null,
    hasAds: false,
    description: "Pour réviser sereinement toute l'année",
  },
  {
    code: "premium",
    name: "Premium",
    priceFcfa: 6000,
    monthlyCredits: 3000,
    maxPdfs: null,
    hasAds: false,
    highlight: true,
    description: "Pour les étudiants qui veulent aller plus loin",
  },
  {
    code: "pro",
    name: "Pro",
    priceFcfa: 10000,
    monthlyCredits: 10000,
    maxPdfs: null,
    hasAds: false,
    description: "Pour les gros volumes de révision et mémoires",
  },
];

export interface CreditPackDefinition {
  code: CreditPackCode;
  name: string;
  credits: number;
  priceFcfa: number;
}

export const CREDIT_PACKS: CreditPackDefinition[] = [
  { code: "pack_s", name: "Pack S", credits: 500, priceFcfa: 1500 },
  { code: "pack_m", name: "Pack M", credits: 1500, priceFcfa: 4000 },
  { code: "pack_l", name: "Pack L", credits: 5000, priceFcfa: 12000 },
];

export function planByCode(code: SubscriptionPlanCode): PlanDefinition {
  const plan = PLANS.find((p) => p.code === code);
  if (!plan) throw new Error(`Plan inconnu : ${code}`);
  return plan;
}
