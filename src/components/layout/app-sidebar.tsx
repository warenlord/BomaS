"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GraduationCap, SquarePen, MessageSquare, FileText, ListChecks, CreditCard } from "lucide-react";
import { CreditMeter } from "@/components/credits/credit-meter";
import { UserMenu } from "@/components/layout/user-menu";
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
}

export function AppSidebar({
  stats,
  planName,
  conversations,
  email,
  fullName,
}: {
  stats: CreditUsageStats;
  planName: string;
  conversations: SidebarConversation[];
  email: string;
  fullName: string | null;
}) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-border/60 bg-sidebar text-sidebar-foreground md:flex">
      <div className="flex h-16 items-center px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="flex size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <GraduationCap className="size-5" />
          </span>
          BomaSchool
        </Link>
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

      <div className="mt-2 flex min-h-0 flex-1 flex-col">
        <p className="px-6 pt-3 pb-1 text-xs font-medium text-sidebar-foreground/50">Récents</p>
        <div className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-2">
          {conversations.length === 0 && (
            <p className="px-3 py-2 text-xs text-sidebar-foreground/50">Tes conversations apparaîtront ici.</p>
          )}
          {conversations.map((c) => {
            const active = pathname === `/chat/${c.id}`;
            const Icon = c.document_id ? FileText : MessageSquare;
            return (
              <Link
                key={c.id}
                href={`/chat/${c.id}`}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}
              >
                <Icon className="size-3.5 shrink-0 opacity-70" />
                <span className="truncate">{c.title}</span>
              </Link>
            );
          })}
          {conversations.length > 0 && (
            <Link
              href="/chat"
              className="block px-3 py-2 text-xs font-medium text-sidebar-foreground/50 hover:text-sidebar-foreground/80"
            >
              Voir tout l&apos;historique
            </Link>
          )}
        </div>
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
