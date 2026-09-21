import type { z } from "zod";
import {
  flashcardsSchema,
  summarySchema,
  revisionSheetSchema,
  memoireAnalysisSchema,
  flashcardsPrompt,
  summaryPrompt,
  revisionSheetPrompt,
  memoireAnalysisPrompt,
} from "@/lib/ai/prompts";
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
 * QCM et examen sont volontairement absents de cette table : ils ont leurs
 * propres routes dédiées (/api/generate/qcm, /api/generate/exam) qui génèrent
 * et redigent le corrigé côté serveur avant tout envoi au client. Les inclure
 * ici permettrait à /api/generated-content d'accepter un contenu QCM/examen
 * fabriqué par le client lui-même (avec ses propres "bonnes réponses"),
 * contournant tout le dispositif de correction différée.
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
  memoire_analysis: {
    schema: memoireAnalysisSchema,
    feature: "memoire_analysis",
    build: (input) => memoireAnalysisPrompt(input.sourceText),
  },
};
