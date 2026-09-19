import type { SupabaseClient } from "@supabase/supabase-js";
import type { CreditFeature, Database } from "@/lib/types/database.types";
import { CREDIT_COSTS } from "@/lib/credits/costs";

export class InsufficientCreditsError extends Error {
  constructor(public readonly required: number, public readonly available: number) {
    super(`Crédits insuffisants : ${available} disponibles, ${required} requis.`);
    this.name = "InsufficientCreditsError";
  }
}

export async function getWallet(supabase: SupabaseClient<Database>, userId: string) {
  const { data, error } = await supabase
    .from("credit_wallets")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error) throw error;
  return data;
}

export async function hasEnoughCredits(
  supabase: SupabaseClient<Database>,
  userId: string,
  feature: CreditFeature,
): Promise<boolean> {
  const wallet = await getWallet(supabase, userId);
  return wallet.balance >= CREDIT_COSTS[feature];
}

/**
 * Débite les crédits pour une action, une fois celle-ci exécutée avec succès
 * (jamais avant : un échec de génération IA ne doit pas coûter de crédits).
 * Lève `InsufficientCreditsError` si le solde est insuffisant.
 */
export async function deductCredits(
  supabase: SupabaseClient<Database>,
  userId: string,
  feature: CreditFeature,
  options?: { referenceId?: string; description?: string },
): Promise<number> {
  const amount = CREDIT_COSTS[feature];

  const { data, error } = await supabase.rpc("deduct_credits", {
    p_user_id: userId,
    p_amount: amount,
    p_feature: feature,
    p_reference_id: options?.referenceId ?? null,
    p_description: options?.description ?? null,
  });

  if (error) {
    if (error.message?.includes("INSUFFICIENT_CREDITS")) {
      const wallet = await getWallet(supabase, userId);
      throw new InsufficientCreditsError(amount, wallet.balance);
    }
    throw error;
  }

  return data as number;
}

export async function addCredits(
  supabase: SupabaseClient<Database>,
  userId: string,
  amount: number,
  type: "purchase" | "bonus" | "refund" | "subscription_renewal",
  options?: { referenceId?: string; description?: string },
): Promise<number> {
  const { data, error } = await supabase.rpc("add_credits", {
    p_user_id: userId,
    p_amount: amount,
    p_type: type,
    p_reference_id: options?.referenceId ?? null,
    p_description: options?.description ?? null,
  });

  if (error) throw error;
  return data as number;
}

export interface CreditUsageStats {
  balance: number;
  monthlyAllowance: number;
  periodEnd: string;
  usedToday: number;
  usedThisWeek: number;
  dailyBudget: number;
  weeklyBudget: number;
  monthlyPercentUsed: number;
  dailyPercentUsed: number;
  weeklyPercentUsed: number;
}

/**
 * Calcule les jauges d'utilisation jour / semaine / mois :
 * le quota mensuel est réparti en une quote-part journalière et hebdomadaire
 * indicative, comparée à la consommation réelle sur la fenêtre glissante.
 */
export async function getUsageStats(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<CreditUsageStats> {
  const wallet = await getWallet(supabase, userId);

  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const { data: recentUsage, error } = await supabase
    .from("credit_transactions")
    .select("amount, created_at, type")
    .eq("user_id", userId)
    .eq("type", "usage")
    .gte("created_at", startOfWeek.toISOString());

  if (error) throw error;

  let usedToday = 0;
  let usedThisWeek = 0;
  for (const tx of recentUsage ?? []) {
    const amount = Math.abs(tx.amount);
    usedThisWeek += amount;
    if (new Date(tx.created_at) >= startOfDay) usedToday += amount;
  }

  const dailyBudget = Math.max(1, Math.round(wallet.monthly_allowance / 30));
  const weeklyBudget = Math.max(1, Math.round(wallet.monthly_allowance / 4.33));
  const monthlyPercentUsed =
    wallet.monthly_allowance > 0
      ? Math.min(100, Math.round(((wallet.monthly_allowance - wallet.balance) / wallet.monthly_allowance) * 100))
      : 0;

  return {
    balance: wallet.balance,
    monthlyAllowance: wallet.monthly_allowance,
    periodEnd: wallet.period_end,
    usedToday,
    usedThisWeek,
    dailyBudget,
    weeklyBudget,
    monthlyPercentUsed,
    dailyPercentUsed: Math.min(100, Math.round((usedToday / dailyBudget) * 100)),
    weeklyPercentUsed: Math.min(100, Math.round((usedThisWeek / weeklyBudget) * 100)),
  };
}
