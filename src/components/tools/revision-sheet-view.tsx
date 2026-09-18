import type { DeepPartial } from "ai";
import type { RevisionSheetContent } from "@/lib/ai/prompts";

export function RevisionSheetView({ object }: { object: DeepPartial<RevisionSheetContent> | undefined }) {
  const sections = (object?.sections ?? []).filter((s): s is { heading: string; content: string } =>
    Boolean(s?.heading && s?.content),
  );

  if (sections.length === 0) return null;

  return (
    <div className="space-y-4">
      {object?.title && <h2 className="font-semibold">{object.title}</h2>}
      {sections.map((section, i) => (
        <div key={i} className="rounded-2xl border border-border/60 bg-card p-4">
          <p className="mb-2 text-sm font-semibold text-primary">{section.heading}</p>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{section.content}</p>
        </div>
      ))}
    </div>
  );
}
