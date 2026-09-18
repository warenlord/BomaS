import Link from "next/link";
import { GraduationCap } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center gap-8 bg-muted/30 px-4 py-12">
      <Link href="/" className="flex items-center gap-2 font-semibold">
        <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <GraduationCap className="size-5" />
        </span>
        <span className="text-xl">BomaSchool</span>
      </Link>

      <div className="w-full max-w-sm rounded-2xl border border-border/60 bg-card p-6 shadow-sm sm:p-8">
        {children}
      </div>
    </div>
  );
}
