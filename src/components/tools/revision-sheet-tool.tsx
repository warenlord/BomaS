"use client";

import { GeneratorWorkspace } from "@/components/tools/generator-workspace";
import { RevisionSheetView } from "@/components/tools/revision-sheet-view";
import type { PickerDocument } from "@/components/tools/document-picker";
import { revisionSheetSchema } from "@/lib/ai/prompts";
import { CREDIT_COSTS } from "@/lib/credits/costs";

export function RevisionSheetTool({
  documents,
  initialDocumentId,
}: {
  documents: PickerDocument[];
  initialDocumentId?: string;
}) {
  return (
    <GeneratorWorkspace
      type="revision_sheet"
      schema={revisionSheetSchema}
      label="Fiche de révision"
      creditCost={CREDIT_COSTS.revision_sheet}
      documents={documents}
      initialDocumentId={initialDocumentId}
      renderResult={(object) => <RevisionSheetView object={object} />}
    />
  );
}
