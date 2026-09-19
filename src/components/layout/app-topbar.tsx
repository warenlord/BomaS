import Link from "next/link";
import { GraduationCap, Zap } from "lucide-react";
import { UserMenu } from "@/components/layout/user-menu";
import { formatCredits } from "@/lib/format";

export function AppTopbar({
  email,
  fullName,
  balance,
}: {
  email: string;
  fullName: string | null;
  balance: number;
}) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border/60 bg-background/95 px-4 backdrop-blur md:h-16 md:px-6">
      <Link href="/chat" className="flex items-center gap-2 font-semibold md:hidden">
        <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <GraduationCap className="size-4" />
        </span>
        BomaSchool
      </Link>

      <div className="ml-auto flex items-center gap-3">
        <Link
          href="/billing"
          className="flex items-center gap-1.5 rounded-full border border-border/60 bg-muted px-3 py-1 text-xs font-medium"
        >
          <Zap className="size-3.5 text-primary" />
          {formatCredits(balance)} crédits
        </Link>
        <div className="md:hidden">
          <UserMenu email={email} fullName={fullName} />
        </div>
      </div>
    </header>
  );
}
