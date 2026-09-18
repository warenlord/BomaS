import type { DeepPartial } from "ai";
import { CheckCircle2 } from "lucide-react";
import type { SummaryContent } from "@/lib/ai/prompts";

export function SummaryView({ object }: { object: DeepPartial<SummaryContent> | undefined }) {
  if (!object?.summary && !object?.keyPoints?.length) return null;

  return (
    <div className="space-y-4">
      {object.title && <h2 className="font-semibold">{object.title}</h2>}

      {object.summary && (
        <div className="rounded-2xl border border-border/60 bg-card p-4 text-sm leading-relaxed whitespace-pre-wrap">
          {object.summary}
        </div>
      )}

      {object.keyPoints && object.keyPoints.length > 0 && (
        <div className="rounded-2xl border border-border/60 bg-card p-4">
          <p className="mb-2 text-sm font-medium">Points clés</p>
          <ul className="space-y-2">
            {object.keyPoints.map(
              (point, i) =>
                point && (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                    {point}
                  </li>
                ),
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
