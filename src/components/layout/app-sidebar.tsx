"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GraduationCap, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { APP_NAV_ITEMS } from "@/components/layout/nav-items";
import { CreditMeter } from "@/components/credits/credit-meter";
import type { CreditUsageStats } from "@/lib/credits/ledger";
import { cn } from "@/lib/utils";

export function AppSidebar({ stats, planName }: { stats: CreditUsageStats; planName: string }) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-border/60 bg-sidebar text-sidebar-foreground md:flex">
      <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-5 font-semibold">
        <span className="flex size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
          <GraduationCap className="size-5" />
        </span>
        BomaSchool
      </div>

      <div className="px-4 pt-4">
        <Button
          className="w-full"
          render={
            <Link href="/chat/new">
              <Plus className="size-4" />
              Nouvelle conversation
            </Link>
          }
        />
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {APP_NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
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

      <div className="border-t border-sidebar-border p-4">
        <p className="mb-2 text-xs font-medium text-sidebar-foreground/60">Plan {planName}</p>
        <CreditMeter stats={stats} />
        <Button
          variant="outline"
          size="sm"
          className="mt-3 w-full"
          render={<Link href="/billing">Gérer mon abonnement</Link>}
        />
      </div>
    </aside>
  );
}
