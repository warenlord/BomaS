import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getCachedUsageStats, getCachedStreak } from "@/lib/credits/ledger";
import { getCachedUserSubscription } from "@/lib/billing/subscription";
import { getCachedConversations } from "@/lib/chat/queries";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppTopbar } from "@/components/layout/app-topbar";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { CommandPalette } from "@/components/layout/command-palette";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const [stats, { plan }, conversations, streak] = await Promise.all([
    getCachedUsageStats(user.id),
    getCachedUserSubscription(user.id),
    getCachedConversations(user.id),
    getCachedStreak(user.id),
  ]);

  const fullName = (user.user_metadata?.full_name as string | undefined) ?? null;

  // Les conversations épinglées ne doivent jamais disparaître de la sidebar
  // même si elles sont anciennes : on les fait remonter avant de tronquer.
  const sortedConversations = [...conversations].sort((a, b) => Number(b.pinned) - Number(a.pinned));

  return (
    <div className="flex min-h-full flex-1 print:block">
      <div className="print:hidden">
        <AppSidebar
          stats={stats}
          planName={plan.name}
          conversations={sortedConversations.slice(0, 20)}
          streak={streak}
          email={user.email ?? ""}
          fullName={fullName}
        />
      </div>

      <div className="flex min-h-full flex-1 flex-col print:block">
        <div className="print:hidden">
          <AppTopbar email={user.email ?? ""} fullName={fullName} balance={stats.balance} />
        </div>
        <main className="flex-1 pb-20 md:pb-0 print:p-0">{children}</main>
      </div>

      <div className="print:hidden">
        <MobileBottomNav />
      </div>

      <div className="print:hidden">
        <CommandPalette conversations={sortedConversations.slice(0, 20).map((c) => ({ id: c.id, title: c.title }))} />
      </div>
    </div>
  );
}
