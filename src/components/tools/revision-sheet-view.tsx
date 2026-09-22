"use client";

import type { ComponentType } from "react";
import type { DeepPartial } from "ai";
import { Printer, BookOpen, Lightbulb, Sigma, ListChecks, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { RevisionSheetContent } from "@/lib/ai/prompts";

const SECTION_META: Record<
  string,
  { label: string; icon: ComponentType<{ className?: string }>; className: string; wide?: boolean }
> = {
  definition: {
    label: "Définition",
    icon: BookOpen,
    className: "border-l-4 border-l-emerald-600/70 bg-black/[0.02]",
  },
  principe: {
    label: "Principe",
    icon: Lightbulb,
    className: "border-l-4 border-l-blue-600/70 bg-black/[0.02]",
  },
  formule: {
    label: "Formule",
    icon: Sigma,
    className: "border border-dashed border-black/30 bg-amber-500/10 font-mono",
    wide: true,
  },
  exemple: {
    label: "Exemple",
    icon: ListChecks,
    className: "border border-black/15 bg-black/[0.03]",
    wide: true,
  },
  point_cle: {
    label: "Point clé",
    icon: Star,
    className: "border-l-4 border-l-amber-600 bg-amber-500/10",
  },
};

type Section = RevisionSheetContent["sections"][number];

export function RevisionSheetView({ object }: { object: DeepPartial<RevisionSheetContent> | undefined }) {
  const sections = (object?.sections ?? []).filter((s): s is Section => Boolean(s?.heading && s?.type && s?.content));

  if (sections.length === 0) return null;

  return (
    <div className="mt-2">
      <div className="mb-3 flex justify-end print:hidden">
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <Printer className="size-4" />
          Imprimer / Exporter en PDF
        </Button>
      </div>

      <div className="flex justify-center overflow-x-auto bg-muted/30 py-6 print:overflow-visible print:bg-transparent print:p-0">
        <div className="min-h-[297mm] w-[210mm] max-w-full bg-white p-[15mm] text-black shadow-lg print:min-h-0 print:w-full print:shadow-none">
          {object?.title && <h1 className="mb-4 border-b border-black/10 pb-2 text-lg font-bold">{object.title}</h1>}

          <div className="grid gap-3 sm:grid-cols-2">
            {sections.map((section, i) => {
              const meta = SECTION_META[section.type] ?? SECTION_META.definition;
              const Icon = meta.icon;
              return (
                <div
                  key={i}
                  className={cn(
                    "break-inside-avoid rounded-md p-3 text-[13px] leading-snug",
                    meta.className,
                    meta.wide && "sm:col-span-2",
                  )}
                >
                  <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-black/60 uppercase">
                    <Icon className="size-3.5" />
                    {meta.label} · {section.heading}
                  </p>
                  <p className="whitespace-pre-wrap text-black/90">{section.content}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
