import Link from "next/link";
import { Button } from "@/components/ui/button";
import { GraduationCap } from "lucide-react";

export function MarketingNavBar() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <GraduationCap className="size-5" />
          </span>
          <span className="text-lg">BomaSchool</span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium text-muted-foreground sm:flex">
          <Link href="/#fonctionnalites" className="transition-colors hover:text-foreground">
            Fonctionnalités
          </Link>
          <Link href="/pricing" className="transition-colors hover:text-foreground">
            Tarifs
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            className="hidden sm:inline-flex"
            render={<Link href="/login">Connexion</Link>}
          />
          <Button render={<Link href="/signup">Commencer</Link>} />
        </div>
      </div>
    </header>
  );
}
