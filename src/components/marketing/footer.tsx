import Link from "next/link";

export function MarketingFooter() {
  return (
    <footer className="border-t border-border/60 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 text-center text-sm text-muted-foreground sm:flex-row sm:justify-between sm:px-6 sm:text-left">
        <p>© {new Date().getFullYear()} BomaSchool. Fait pour les étudiants du Gabon 🇬🇦.</p>
        <nav className="flex items-center gap-4">
          <Link href="/pricing" className="hover:text-foreground">
            Tarifs
          </Link>
          <Link href="/login" className="hover:text-foreground">
            Connexion
          </Link>
          <Link href="/signup" className="hover:text-foreground">
            Créer un compte
          </Link>
        </nav>
      </div>
    </footer>
  );
}
