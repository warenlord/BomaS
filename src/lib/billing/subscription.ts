import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";
import { createClient } from "@/lib/supabase/server";

export async function getUserSubscription(supabase: SupabaseClient<Database>, userId: string) {
  const { data: subscription, error } = await supabase
    .from("user_subscriptions")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error) throw error;

  const { data: plan, error: planError } = await supabase
    .from("subscription_plans")
    .select("*")
    .eq("id", subscription.plan_id)
    .single();

  if (planError) throw planError;

  return { subscription, plan };
}

/**
 * Variante mémorisée par requête : plusieurs Server Components (layout,
 * page billing/settings...) ont besoin de l'abonnement pour la même requête.
 */
export const getCachedUserSubscription = cache(async (userId: string) => {
  const supabase = await createClient();
  return getUserSubscription(supabase, userId);
});
