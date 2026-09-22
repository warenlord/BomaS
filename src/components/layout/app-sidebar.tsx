"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GraduationCap, SquarePen, FileText, ListChecks, CreditCard, Pin } from "lucide-react";
import { CreditMeter } from "@/components/credits/credit-meter";
import { UserMenu } from "@/components/layout/user-menu";
import { ConversationItem } from "@/components/layout/conversation-item";
import { StreakBadge } from "@/components/layout/streak-badge";
import type { CreditUsageStats } from "@/lib/credits/ledger";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/chat/new", label: "Nouvelle conversation", icon: SquarePen },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/tools", label: "Outils", icon: ListChecks },
  { href: "/billing", label: "Crédits", icon: CreditCard },
] as const;

export interface SidebarConversation {
  id: string;
  title: string;
  document_id: string | null;
  pinned: boolean;
  updated_at: string;
}

function groupByDate(conversations: SidebarConversation[]) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const sevenDaysAgo = new Date(startOfToday.getTime() - 7 * 24 * 60 * 60 * 1000);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const groups: { label: string; items: SidebarConversation[] }[] = [
    { label: "Aujourd'hui", items: [] },
    { label: "7 derniers jours", items: [] },
    { label: "Ce mois-ci", items: [] },
    { label: "Plus ancien", items: [] },
  ];

  for (const c of conversations) {
    const updatedAt = new Date(c.updated_at);
    if (updatedAt >= startOfToday) groups[0].items.push(c);
    else if (updatedAt >= sevenDaysAgo) groups[1].items.push(c);
    else if (updatedAt >= startOfMonth) groups[2].items.push(c);
    else groups[3].items.push(c);
  }

  return groups.filter((g) => g.items.length > 0);
}

export function AppSidebar({
  stats,
  planName,
  conversations,
  streak,
  email,
  fullName,
}: {
  stats: CreditUsageStats;
  planName: string;
  conversations: SidebarConversation[];
  streak: number;
  email: string;
  fullName: string | null;
}) {
  const pathname = usePathname();

  const pinned = conversations.filter((c) => c.pinned);
  const unpinned = conversations.filter((c) => !c.pinned);
  const groups = groupByDate(unpinned);

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-border/60 bg-sidebar text-sidebar-foreground md:flex">
      <div className="flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="flex size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <GraduationCap className="size-5" />
          </span>
          BomaSchool
        </Link>
        {streak > 0 && <StreakBadge days={streak} />}
      </div>

      <nav className="space-y-0.5 px-3">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || (item.href !== "/chat/new" && pathname.startsWith(`${item.href}/`));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-2 flex min-h-0 flex-1 flex-col overflow-y-auto px-3 pb-2">
        {conversations.length === 0 && (
          <p className="px-3 py-2 text-xs text-sidebar-foreground/50">Tes conversations apparaîtront ici.</p>
        )}

        {pinned.length > 0 && (
          <div className="mb-2">
            <p className="flex items-center gap-1 px-3 pt-3 pb-1 text-xs font-medium text-sidebar-foreground/50">
              <Pin className="size-3" />
              Épinglées
            </p>
            <div className="space-y-0.5">
              {pinned.map((c) => (
                <ConversationItem key={c.id} conversation={c} />
              ))}
            </div>
          </div>
        )}

        {groups.map((group) => (
          <div key={group.label} className="mb-2">
            <p className="px-3 pt-3 pb-1 text-xs font-medium text-sidebar-foreground/50">{group.label}</p>
            <div className="space-y-0.5">
              {group.items.map((c) => (
                <ConversationItem key={c.id} conversation={c} />
              ))}
            </div>
          </div>
        ))}

        {conversations.length > 0 && (
          <Link
            href="/chat"
            className="block px-3 py-2 text-xs font-medium text-sidebar-foreground/50 hover:text-sidebar-foreground/80"
          >
            Voir tout l&apos;historique
          </Link>
        )}
      </div>

      <div className="border-t border-sidebar-border p-3">
        <div className="mb-1 px-1">
          <CreditMeter stats={stats} compact />
        </div>
        <UserMenu email={email} fullName={fullName} planName={planName} variant="row" />
      </div>
    </aside>
  );
}
