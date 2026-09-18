"use client";

import { GeneratorWorkspace } from "@/components/tools/generator-workspace";
import { SummaryView } from "@/components/tools/summary-view";
import { summarySchema } from "@/lib/ai/prompts";
import { CREDIT_COSTS } from "@/lib/credits/costs";

export function SummaryTool({ documentId, documentTitle }: { documentId?: string; documentTitle?: string | null }) {
  return (
    <GeneratorWorkspace
      type="summary"
      schema={summarySchema}
      label="Résumé de cours"
      creditCost={CREDIT_COSTS.summary}
      documentId={documentId}
      documentTitle={documentTitle}
      renderResult={(object) => <SummaryView object={object} />}
    />
  );
}
