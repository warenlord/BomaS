/**
 * Si CRON_SECRET n'est pas configuré dans l'environnement, l'en-tête attendu
 * devient littéralement "Bearer undefined" — une chaîne devinable. On refuse
 * explicitement quand le secret est absent plutôt que de comparer contre
 * cette valeur par défaut.
 */
export function isAuthorizedCronRequest(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}
