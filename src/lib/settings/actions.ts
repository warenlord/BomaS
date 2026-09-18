"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateProfileAction(formData: FormData) {
  const fullName = String(formData.get("fullName") ?? "").trim();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.auth.updateUser({ data: { full_name: fullName } });
  await supabase.from("profiles").update({ full_name: fullName }).eq("id", user.id);

  revalidatePath("/settings");
}
