import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUsageStats } from "@/lib/credits/ledger";
import { getUserSubscription } from "@/lib/billing/subscription";
import { listConversations } from "@/lib/chat/queries";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppTopbar } from "@/components/layout/app-topbar";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [stats, { plan }, conversations] = await Promise.all([
    getUsageStats(supabase, user.id),
    getUserSubscription(supabase, user.id),
    listConversations(supabase, user.id),
  ]);

  const fullName = (user.user_metadata?.full_name as string | undefined) ?? null;

  return (
    <div className="flex min-h-full flex-1">
      <AppSidebar
        stats={stats}
        planName={plan.name}
        conversations={conversations.slice(0, 12)}
        email={user.email ?? ""}
        fullName={fullName}
      />

      <div className="flex min-h-full flex-1 flex-col">
        <AppTopbar email={user.email ?? ""} fullName={fullName} balance={stats.balance} />
        <main className="flex-1 pb-20 md:pb-0">{children}</main>
      </div>

      <MobileBottomNav />
    </div>
  );
}
