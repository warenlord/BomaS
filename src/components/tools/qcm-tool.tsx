"use client";

import { useState } from "react";
import { GeneratorWorkspace } from "@/components/tools/generator-workspace";
import { QcmView } from "@/components/tools/qcm-view";
import { qcmSchema } from "@/lib/ai/prompts";
import { CREDIT_COSTS } from "@/lib/credits/costs";

const QUESTION_COUNTS = [10, 20, 50] as const;

export function QcmTool({ documentId, documentTitle }: { documentId?: string; documentTitle?: string | null }) {
  const [questionCount, setQuestionCount] = useState<10 | 20 | 50>(10);

  return (
    <GeneratorWorkspace
      type="qcm"
      schema={qcmSchema}
      label="Générateur de QCM"
      creditCost={CREDIT_COSTS.qcm}
      documentId={documentId}
      documentTitle={documentTitle}
      extraBody={{ questionCount }}
      renderControls={({ disabled }) => (
        <div className="mb-4 flex gap-2">
          {QUESTION_COUNTS.map((count) => (
            <button
              key={count}
              type="button"
              disabled={disabled}
              onClick={() => setQuestionCount(count)}
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                questionCount === count
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background hover:bg-muted"
              }`}
            >
              {count} questions
            </button>
          ))}
        </div>
      )}
      renderResult={(object, savedId) => <QcmView object={object} savedId={savedId} />}
    />
  );
}
