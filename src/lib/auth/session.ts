import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/**
 * Mémorisé par requête (React `cache`) : le layout et la page appellent tous
 * deux "qui est l'utilisateur ?" pour la même requête. Sans ce cache, chaque
 * navigation déclenchait plusieurs allers-retours réseau identiques vers
 * Supabase Auth en plus de celui déjà fait par le middleware.
 */
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});
