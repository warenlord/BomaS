/**
 * Plafond du texte collé librement par l'utilisateur (hors documents, déjà
 * plafonnés par getDocumentsFullText). Sans ça, un texte volontairement énorme
 * qui fait échouer la génération (ex: dépassement de contexte du modèle) ne
 * coûte aucun crédit — le débit n'a lieu qu'après succès — mais consomme
 * quand même de vrais tokens OpenAI à chaque tentative : un déni de service
 * gratuit et répétable.
 */
export const MAX_PASTED_TEXT_LENGTH = 20000;

export function isTextTooLong(text: string, max = MAX_PASTED_TEXT_LENGTH): boolean {
  return text.length > max;
}
