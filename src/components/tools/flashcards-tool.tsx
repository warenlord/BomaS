"use client";

import { GeneratorWorkspace } from "@/components/tools/generator-workspace";
import { FlashcardsView } from "@/components/tools/flashcards-view";
import type { PickerDocument } from "@/components/tools/document-picker";
import { flashcardsSchema } from "@/lib/ai/prompts";
import { CREDIT_COSTS } from "@/lib/credits/costs";

export function FlashcardsTool({
  documents,
  initialDocumentId,
}: {
  documents: PickerDocument[];
  initialDocumentId?: string;
}) {
  return (
    <GeneratorWorkspace
      type="flashcards"
      schema={flashcardsSchema}
      label="Générateur de flashcards"
      creditCost={CREDIT_COSTS.flashcards}
      documents={documents}
      initialDocumentId={initialDocumentId}
      renderResult={(object) => <FlashcardsView object={object} />}
    />
  );
}
