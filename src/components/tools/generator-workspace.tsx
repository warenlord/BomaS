"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useObject } from "@ai-sdk/react";
import type { DeepPartial } from "ai";
import type { z } from "zod";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { UploadDropzone } from "@/components/documents/upload-dropzone";
import { DocumentPicker, type PickerDocument } from "@/components/tools/document-picker";

export function GeneratorWorkspace<Schema extends z.ZodType>({
  type,
  schema,
  label,
  creditCost,
  documents,
  initialDocumentId,
  extraBody,
  renderControls,
  renderResult,
}: {
  type: string;
  schema: Schema;
  label: string;
  creditCost: number;
  documents: PickerDocument[];
  initialDocumentId?: string;
  extraBody?: Record<string, unknown>;
  renderControls?: (opts: { disabled: boolean }) => ReactNode;
  renderResult: (object: DeepPartial<z.infer<Schema>> | undefined, savedId: string | null) => ReactNode;
}) {
  const [text, setText] = useState("");
  const [savedId, setSavedId] = useState<string | null>(null);
  const [extraDocuments, setExtraDocuments] = useState<PickerDocument[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>(initialDocumentId ? [initialDocumentId] : []);
  const router = useRouter();

  const allDocuments = [...documents, ...extraDocuments];

  const { object, submit, isLoading, error } = useObject({
    api: `/api/generate/${type}`,
    schema,
    onFinish: async ({ object: finalObject, error: parseError }) => {
      if (!finalObject || parseError) return;

      try {
        const res = await fetch("/api/generated-content", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type, documentIds: selectedIds, content: finalObject }),
        });
        const data = await res.json();
        if (res.ok) {
          setSavedId(data.id);
          if (data.warning === "INSUFFICIENT_CREDITS_NOT_CHARGED") {
            toast.warning("Solde de crédits insuffisant : ce contenu n'a pas pu être décompté correctement.");
          }
          // Le crédit vient d'être débité côté serveur : on rafraîchit la
          // jauge affichée dans la sidebar sans perdre le résultat déjà généré.
          router.refresh();
        }
      } catch {
        toast.error("Le contenu a été généré mais n'a pas pu être sauvegardé.");
      }
    },
  });

  const usingDocuments = selectedIds.length > 0;
  const canSubmit = usingDocuments || text.trim().length > 50;

  function handleGenerate() {
    setSavedId(null);
    submit({ documentIds: usingDocuments ? selectedIds : undefined, text: usingDocuments ? undefined : text, ...extraBody });
  }

  const selectedTitles = allDocuments.filter((d) => selectedIds.includes(d.id)).map((d) => d.title);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-4">
        <h1 className="text-xl font-semibold">{label}</h1>
        {selectedTitles.length > 0 ? (
          <p className="text-sm text-muted-foreground">
            À partir de « {selectedTitles.join(" », « ")} » · {creditCost} crédit{creditCost > 1 ? "s" : ""}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Choisis un ou plusieurs documents, ou colle un texte · {creditCost} crédit{creditCost > 1 ? "s" : ""}
          </p>
        )}
      </div>

      <DocumentPicker documents={allDocuments} selectedIds={selectedIds} onChange={setSelectedIds} />

      {!usingDocuments && (
        <div className="mb-4 space-y-3">
          {allDocuments.length > 0 && (
            <div className="flex items-center gap-3">
              <Separator className="flex-1" />
              <span className="text-xs text-muted-foreground">ou</span>
              <Separator className="flex-1" />
            </div>
          )}
          <UploadDropzone
            compact
            onUploaded={(doc) => {
              setExtraDocuments((prev) => [...prev, { ...doc, subject: null }]);
              setSelectedIds((prev) => [...prev, doc.id]);
            }}
          />
          <div className="flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground">ou</span>
            <Separator className="flex-1" />
          </div>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Colle ici le contenu de ton cours (au moins quelques phrases)..."
            className="max-h-64 min-h-32 overflow-y-auto"
          />
        </div>
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
