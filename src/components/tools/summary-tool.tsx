"use client";

import { GeneratorWorkspace } from "@/components/tools/generator-workspace";
import { SummaryView } from "@/components/tools/summary-view";
import type { PickerDocument } from "@/components/tools/document-picker";
import type { ConversationSource } from "@/components/tools/conversation-source-card";
import { summarySchema } from "@/lib/ai/prompts";
import { CREDIT_COSTS } from "@/lib/credits/costs";

export function SummaryTool({
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
      type="summary"
      schema={summarySchema}
      label="Résumé de cours"
      creditCost={CREDIT_COSTS.summary}
      documents={documents}
      initialDocumentId={initialDocumentId}
      conversationSource={conversationSource}
      renderResult={(object) => <SummaryView object={object} />}
    />
  );
}
