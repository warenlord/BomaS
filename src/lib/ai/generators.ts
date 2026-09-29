import type { z } from "zod";
import { flashcardsSchema, summarySchema, revisionSheetSchema, flashcardsPrompt, summaryPrompt, revisionSheetPrompt } from "@/lib/ai/prompts";
import type { CreditFeature, GeneratedContentType } from "@/lib/types/database.types";

export interface GeneratorInput {
  sourceText: string;
  questionCount?: 10 | 20 | 50;
  durationMinutes?: number;
}

export interface GeneratorDefinition {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schema: z.ZodType<any>;
  feature: CreditFeature;
  build: (input: GeneratorInput) => { system: string; prompt: string };
}

/**
 * QCM, examen et analyse de mémoire sont volontairement absents de cette
 * table : ils ont leurs propres routes dédiées (/api/generate/qcm,
 * /api/generate/exam, /api/generate/memoire-analysis) qui génèrent en une
 * fois (generateObject, pas de streaming) pour pouvoir rédiger le corrigé
 * côté serveur (QCM/examen) ou calculer un tarif dépendant de la taille
 * réelle du document avant génération (mémoire — voir memoireAnalysisCost).
 * Les types listés ici sont streamés via /api/generate/[type], qui persiste
 * et facture lui-même dans le onFinish du flux, côté serveur.
 */
export const GENERATORS: Partial<Record<GeneratedContentType, GeneratorDefinition>> = {
  flashcards: {
    schema: flashcardsSchema,
    feature: "flashcards",
    build: (input) => flashcardsPrompt(input.sourceText),
  },
  summary: {
    schema: summarySchema,
    feature: "summary",
    build: (input) => summaryPrompt(input.sourceText),
  },
  revision_sheet: {
    schema: revisionSheetSchema,
    feature: "revision_sheet",
    build: (input) => revisionSheetPrompt(input.sourceText),
  },
};
