import Link from "next/link";
import { Settings, LogOut, User, ChevronsUpDown } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOutAction } from "@/lib/auth/actions";
import { cn } from "@/lib/utils";

interface UserMenuProps {
  email: string;
  fullName: string | null;
  planName?: string;
  /** "avatar" : simple rond (topbar mobile). "row" : ligne pleine largeur avec nom + plan (bas de sidebar desktop). */
  variant?: "avatar" | "row";
}

export function UserMenu({ email, fullName, planName, variant = "avatar" }: UserMenuProps) {
  const initials = (fullName || email).slice(0, 2).toUpperCase();

  return (
    <DropdownMenu>
      {variant === "row" ? (
        <DropdownMenuTrigger
          className={cn(
            "flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left outline-none transition-colors",
            "hover:bg-sidebar-accent focus-visible:bg-sidebar-accent",
          )}
        >
          <Avatar className="size-8 shrink-0">
            <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">{initials}</AvatarFallback>
          </Avatar>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-sidebar-foreground">
              {fullName || "Étudiant BomaSchool"}
            </span>
            {planName && <span className="block truncate text-xs text-sidebar-foreground/60">Plan {planName}</span>}
          </span>
          <ChevronsUpDown className="size-4 shrink-0 text-sidebar-foreground/50" />
        </DropdownMenuTrigger>
      ) : (
        <DropdownMenuTrigger className="rounded-full outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring">
          <Avatar className="size-8">
            <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">{initials}</AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
      )}
      <DropdownMenuContent align={variant === "row" ? "start" : "end"} className="w-56">
        <div className="px-2 py-1.5 text-sm">
          <p className="font-medium">{fullName || "Étudiant BomaSchool"}</p>
          <p className="truncate text-xs text-muted-foreground">{email}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          render={
            <Link href="/settings">
              <Settings className="size-4" />
              Paramètres
            </Link>
          }
        />
        <DropdownMenuItem
          render={
            <Link href="/billing">
              <User className="size-4" />
              Mon abonnement
            </Link>
          }
        />
        <DropdownMenuSeparator />
        <form action={signOutAction}>
          <DropdownMenuItem
            variant="destructive"
            render={
              <button type="submit" className="flex w-full items-center gap-1.5">
                <LogOut className="size-4" />
                Se déconnecter
              </button>
            }
          />
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
