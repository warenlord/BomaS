export function formatFcfa(amount: number): string {
  return `${new Intl.NumberFormat("fr-FR").format(amount)} FCFA`;
}

export function formatCredits(amount: number): string {
  return new Intl.NumberFormat("fr-FR").format(amount);
}

export function formatDateShort(date: string | Date): string {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" }).format(
    new Date(date),
  );
}
