import Link from "next/link";
import Image from "next/image";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center gap-8 bg-muted/30 px-4 py-12">
      <Link href="/" className="flex items-center gap-2 font-semibold">
        <Image src="/logo.png" alt="" width={42} height={36} className="h-9 w-auto" priority />
        <span className="text-xl">BomaSchool</span>
      </Link>

      <div className="w-full max-w-sm rounded-2xl border border-border/60 bg-card p-6 shadow-sm sm:p-8">
        {children}
      </div>
    </div>
  );
}
