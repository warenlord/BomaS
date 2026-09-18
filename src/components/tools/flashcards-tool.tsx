"use client";

import { GeneratorWorkspace } from "@/components/tools/generator-workspace";
import { FlashcardsView } from "@/components/tools/flashcards-view";
import { flashcardsSchema } from "@/lib/ai/prompts";
import { CREDIT_COSTS } from "@/lib/credits/costs";

export function FlashcardsTool({ documentId, documentTitle }: { documentId?: string; documentTitle?: string | null }) {
  return (
    <GeneratorWorkspace
      type="flashcards"
      schema={flashcardsSchema}
      label="Générateur de flashcards"
      creditCost={CREDIT_COSTS.flashcards}
      documentId={documentId}
      documentTitle={documentTitle}
      renderResult={(object) => <FlashcardsView object={object} />}
    />
  );
}
