"use client";

import { GeneratorWorkspace } from "@/components/tools/generator-workspace";
import { FlashcardsView } from "@/components/tools/flashcards-view";
import type { PickerDocument } from "@/components/tools/document-picker";
import type { ConversationSource } from "@/components/tools/conversation-source-card";
import { flashcardsSchema } from "@/lib/ai/prompts";
import { CREDIT_COSTS } from "@/lib/credits/costs";

export function FlashcardsTool({
  documents,
  initialDocumentId,
  conversationSource,
}: {
  documents: PickerDocument[];
  initialDocumentId?: string;
  conversationSource?: ConversationSource | null;
}) {
  return (
    <GeneratorWorkspace
      type="flashcards"
      schema={flashcardsSchema}
      label="Générateur de flashcards"
      creditCost={CREDIT_COSTS.flashcards}
      documents={documents}
      initialDocumentId={initialDocumentId}
      conversationSource={conversationSource}
      renderResult={(object) => <FlashcardsView object={object} />}
    />
  );
}
