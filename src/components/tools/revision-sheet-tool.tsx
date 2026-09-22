"use client";

import { GeneratorWorkspace } from "@/components/tools/generator-workspace";
import { RevisionSheetView } from "@/components/tools/revision-sheet-view";
import type { PickerDocument } from "@/components/tools/document-picker";
import type { ConversationSource } from "@/components/tools/conversation-source-card";
import { revisionSheetSchema } from "@/lib/ai/prompts";
import { CREDIT_COSTS } from "@/lib/credits/costs";

export function RevisionSheetTool({
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
      type="revision_sheet"
      schema={revisionSheetSchema}
      label="Fiche de révision"
      creditCost={CREDIT_COSTS.revision_sheet}
      documents={documents}
      initialDocumentId={initialDocumentId}
      conversationSource={conversationSource}
      renderResult={(object) => <RevisionSheetView object={object} />}
    />
  );
}
