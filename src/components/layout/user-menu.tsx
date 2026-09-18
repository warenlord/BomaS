import Link from "next/link";
import { Settings, LogOut, User } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOutAction } from "@/lib/auth/actions";

export function UserMenu({ email, fullName }: { email: string; fullName: string | null }) {
  const initials = (fullName || email).slice(0, 2).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="rounded-full outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring">
        <Avatar className="size-8">
          <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">{initials}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
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
