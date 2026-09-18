import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/types/database.types";

/**
 * Client Supabase pour Server Components / Route Handlers / Server Actions.
 * `setAll` peut échouer silencieusement quand appelé depuis un Server Component
 * (les cookies ne peuvent pas y être modifiés) : le middleware se charge alors
 * du rafraîchissement de session.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Appelé depuis un Server Component : ignoré, le middleware rafraîchit la session.
          }
        },
      },
    },
  );
}
