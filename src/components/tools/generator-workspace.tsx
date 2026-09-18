"use client";

import { useState, type ReactNode } from "react";
import { useObject } from "@ai-sdk/react";
import type { DeepPartial } from "ai";
import type { z } from "zod";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function GeneratorWorkspace<Schema extends z.ZodType>({
  type,
  schema,
  label,
  creditCost,
  documentId,
  documentTitle,
  extraBody,
  renderControls,
  renderResult,
}: {
  type: string;
  schema: Schema;
  label: string;
  creditCost: number;
  documentId?: string;
  documentTitle?: string | null;
  extraBody?: Record<string, unknown>;
  renderControls?: (opts: { disabled: boolean }) => ReactNode;
  renderResult: (object: DeepPartial<z.infer<Schema>> | undefined, savedId: string | null) => ReactNode;
}) {
  const [text, setText] = useState("");
  const [savedId, setSavedId] = useState<string | null>(null);

  const { object, submit, isLoading, error } = useObject({
    api: `/api/generate/${type}`,
    schema,
    onFinish: async ({ object: finalObject, error: parseError }) => {
      if (!finalObject || parseError) return;

      try {
        const res = await fetch("/api/generated-content", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type, documentId, content: finalObject }),
        });
        const data = await res.json();
        if (res.ok) {
          setSavedId(data.id);
          if (data.warning === "INSUFFICIENT_CREDITS_NOT_CHARGED") {
            toast.warning("Solde de crédits insuffisant : ce contenu n'a pas pu être décompté correctement.");
          }
        }
      } catch {
        toast.error("Le contenu a été généré mais n'a pas pu être sauvegardé.");
      }
    },
  });

  const canSubmit = Boolean(documentId) || text.trim().length > 50;

  function handleGenerate() {
    setSavedId(null);
    submit({ documentId, text: documentId ? undefined : text, ...extraBody });
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-4">
        <h1 className="text-xl font-semibold">{label}</h1>
        {documentTitle ? (
          <p className="text-sm text-muted-foreground">
            À partir de « {documentTitle} » · {creditCost} crédit{creditCost > 1 ? "s" : ""}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Colle le contenu d&apos;un cours · {creditCost} crédit{creditCost > 1 ? "s" : ""}
          </p>
        )}
      </div>

      {!documentId && (
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Colle ici le contenu de ton cours (au moins quelques phrases)..."
          className="mb-4 min-h-40"
        />
      )}

      {renderControls?.({ disabled: isLoading })}

      <Button onClick={handleGenerate} disabled={!canSubmit || isLoading} className="mb-6 w-full sm:w-auto">
        {isLoading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
        Générer
      </Button>

      {error && (
        <p className="mb-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Erreur lors de la génération. Vérifie ton solde de crédits ou réessaie.
        </p>
      )}

      {renderResult(object, savedId)}
    </div>
  );
}
