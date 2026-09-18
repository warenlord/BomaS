"use client";

import { GeneratorWorkspace } from "@/components/tools/generator-workspace";
import { RevisionSheetView } from "@/components/tools/revision-sheet-view";
import { revisionSheetSchema } from "@/lib/ai/prompts";
import { CREDIT_COSTS } from "@/lib/credits/costs";

export function RevisionSheetTool({
  documentId,
  documentTitle,
}: {
  documentId?: string;
  documentTitle?: string | null;
}) {
  return (
    <GeneratorWorkspace
      type="revision_sheet"
      schema={revisionSheetSchema}
      label="Fiche de révision"
      creditCost={CREDIT_COSTS.revision_sheet}
      documentId={documentId}
      documentTitle={documentTitle}
      renderResult={(object) => <RevisionSheetView object={object} />}
    />
  );
}
