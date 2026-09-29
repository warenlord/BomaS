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
 * /api/generate/exam, /api/generate/memoire-analysis). Pour QCM/examen,
 * c'est pour rédiger le corrigé côté serveur avant tout envoi au client. Pour
 * l'analyse de mémoire, c'est parce que son tarif dépend de la taille réelle
 * du document (voir memoireAnalysisCost), calculée avant génération — un flux
 * que ce type générique (streaming, débit après coup) ne permet pas. Les
 * inclure ici permettrait aussi à /api/generated-content d'accepter un
 * contenu fabriqué par le client lui-même, contournant ces protections.
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
