import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";

/**
 * Client "service_role" : contourne les RLS. Réservé au code serveur de confiance
 * (webhooks de paiement, cron de renouvellement des crédits, jobs d'ingestion RAG).
 * Ne jamais importer ce module depuis un composant client ou l'exposer au navigateur.
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
