"use client";

import { useState } from "react";
import { GeneratorWorkspace } from "@/components/tools/generator-workspace";
import { ExamView } from "@/components/tools/exam-view";
import { examSchema } from "@/lib/ai/prompts";
import { CREDIT_COSTS } from "@/lib/credits/costs";

const DURATIONS = [30, 60, 90, 120] as const;

export function ExamTool({ documentId, documentTitle }: { documentId?: string; documentTitle?: string | null }) {
  const [duration, setDuration] = useState<number>(60);

  return (
    <GeneratorWorkspace
      type="exam"
      schema={examSchema}
      label="Examen blanc"
      creditCost={CREDIT_COSTS.exam}
      documentId={documentId}
      documentTitle={documentTitle}
      extraBody={{ durationMinutes: duration }}
      renderControls={({ disabled }) => (
        <div className="mb-4 flex gap-2">
          {DURATIONS.map((d) => (
            <button
              key={d}
              type="button"
              disabled={disabled}
              onClick={() => setDuration(d)}
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                duration === d
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background hover:bg-muted"
              }`}
            >
              {d} min
            </button>
          ))}
        </div>
      )}
      renderResult={(object) => <ExamView object={object} />}
    />
  );
}
