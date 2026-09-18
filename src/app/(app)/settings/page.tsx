import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserSubscription } from "@/lib/billing/subscription";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/auth/submit-button";
import { updateProfileAction } from "@/lib/settings/actions";
import { signOutAction } from "@/lib/auth/actions";
import { formatDateShort } from "@/lib/format";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { plan } = await getUserSubscription(supabase, user.id);
  const fullName = (user.user_metadata?.full_name as string | undefined) ?? "";

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <h1 className="mb-6 text-xl font-semibold">Paramètres</h1>

      <div className="space-y-6 rounded-2xl border border-border/60 bg-card p-5">
        <div>
          <p className="text-sm font-medium">Email</p>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>
        <div>
          <p className="text-sm font-medium">Plan</p>
          <p className="text-sm text-muted-foreground">{plan.name}</p>
        </div>
        <div>
          <p className="text-sm font-medium">Membre depuis</p>
          <p className="text-sm text-muted-foreground">{formatDateShort(user.created_at)}</p>
        </div>

        <form action={updateProfileAction} className="space-y-1.5 border-t border-border/60 pt-6">
          <Label htmlFor="fullName">Nom complet</Label>
          <Input id="fullName" name="fullName" defaultValue={fullName} placeholder="Ton nom" />
          <SubmitButton className="mt-3 w-auto">Enregistrer</SubmitButton>
        </form>
      </div>

      <form action={signOutAction} className="mt-6">
        <SubmitButton variant="outline">Se déconnecter</SubmitButton>
      </form>
    </div>
  );
}
