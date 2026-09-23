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

/**
 * Coût réel de l'analyse d'un document, par palier selon le nombre de
 * morceaux générés après découpage (connu seulement après extraction, avant
 * les embeddings). Un document de 300 pages ne coûte pas la même chose à
 * traiter (temps, risque de timeout) qu'un de 30 — CREDIT_COSTS.document_analysis
 * reste le tarif plancher affiché avant upload ("à partir de X crédits").
 */
export function documentAnalysisCost(chunkCount: number): number {
  if (chunkCount <= 150) return CREDIT_COSTS.document_analysis;
  if (chunkCount <= 400) return 10;
  if (chunkCount <= 800) return 20;
  return 30;
}
