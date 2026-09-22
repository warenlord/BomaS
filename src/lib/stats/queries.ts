import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";

export interface QuickStats {
  documentsCount: number;
  generatedContentCount: number;
  questionsAnswered: number;
}

/** Petites statistiques d'activité affichées en haut de la page Outils. */
export async function getQuickStats(supabase: SupabaseClient<Database>, userId: string): Promise<QuickStats> {
  const [documentsResult, generatedContentResult, attemptsResult] = await Promise.all([
    supabase.from("documents").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("status", "ready"),
    supabase.from("generated_content").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("qcm_attempts").select("total").eq("user_id", userId),
  ]);

  const questionsAnswered = (attemptsResult.data ?? []).reduce((sum, a) => sum + a.total, 0);

  return {
    documentsCount: documentsResult.count ?? 0,
    generatedContentCount: generatedContentResult.count ?? 0,
    questionsAnswered,
  };
}
