/**
 * Taille maximale d'un document importé. Au-delà, l'extraction + les
 * embeddings risquent de dépasser les 300s de maxDuration de la route de
 * traitement (voir /api/documents/process) — mieux vaut refuser clairement
 * à l'upload qu'un échec après une longue attente.
 */
export const MAX_UPLOAD_FILE_SIZE_BYTES = 25 * 1024 * 1024;

export function isFileTooLarge(sizeBytes: number): boolean {
  return sizeBytes > MAX_UPLOAD_FILE_SIZE_BYTES;
}
