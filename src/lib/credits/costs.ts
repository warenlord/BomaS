import type { CreditFeature } from "@/lib/types/database.types";

/** Coût en crédits de chaque action, tel que défini dans le cahier des charges. */
export const CREDIT_COSTS: Record<CreditFeature, number> = {
  chat: 1,
  document_analysis: 5,
  summary: 5,
  qcm: 5,
  revision_sheet: 5,
  flashcards: 3,
  exam: 10,
  memoire_analysis: 30,
};

export const CREDIT_FEATURE_LABELS: Record<CreditFeature, string> = {
  chat: "Question au chat",
  document_analysis: "Analyse de document",
  summary: "Résumé",
  qcm: "QCM",
  revision_sheet: "Fiche de révision",
  flashcards: "Flashcards",
  exam: "Examen blanc",
  memoire_analysis: "Analyse complète de mémoire",
};

export function creditCost(feature: CreditFeature): number {
  return CREDIT_COSTS[feature];
}
