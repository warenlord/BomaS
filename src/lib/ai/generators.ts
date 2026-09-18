import type { z } from "zod";
import {
  qcmSchema,
  flashcardsSchema,
  summarySchema,
  revisionSheetSchema,
  examSchema,
  memoireAnalysisSchema,
  qcmPrompt,
  flashcardsPrompt,
  summaryPrompt,
  revisionSheetPrompt,
  examPrompt,
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

export const GENERATORS: Record<GeneratedContentType, GeneratorDefinition> = {
  qcm: {
    schema: qcmSchema,
    feature: "qcm",
    build: (input) => qcmPrompt(input.sourceText, input.questionCount ?? 10),
  },
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
  exam: {
    schema: examSchema,
    feature: "exam",
    build: (input) => examPrompt(input.sourceText, input.durationMinutes ?? 60),
  },
  memoire_analysis: {
    schema: memoireAnalysisSchema,
    feature: "memoire_analysis",
    build: (input) => memoireAnalysisPrompt(input.sourceText),
  },
};
