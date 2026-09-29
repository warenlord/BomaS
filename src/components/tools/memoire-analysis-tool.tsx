"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { UploadDropzone } from "@/components/documents/upload-dropzone";
import { DocumentPicker, type PickerDocument } from "@/components/tools/document-picker";
import { MemoireAnalysisView, type MemoireAnalysisResult } from "@/components/tools/memoire-analysis-view";
import { CREDIT_COSTS } from "@/lib/credits/costs";

const ERROR_MESSAGES: Record<string, string> = {
  UNAUTHORIZED: "Tu dois être connecté.",
  INSUFFICIENT_CREDITS: "Crédits insuffisants pour analyser ce mémoire.",
  DOCUMENT_NOT_FOUND: "Document introuvable.",
  NO_SOURCE_TEXT: "Ajoute du texte ou choisis un document avec du contenu.",
  TEXT_TOO_LONG: "Le texte collé est trop long. Utilise plutôt un document déjà importé.",
  GENERATION_FAILED: "L'analyse a échoué. Réessaie.",
};

export function MemoireAnalysisTool({
  documents,
  initialDocumentId,
}: {
  documents: PickerDocument[];
  initialDocumentId?: string;
}) {
  const [text, setText] = useState("");
  const [extraDocuments, setExtraDocuments] = useState<PickerDocument[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>(initialDocumentId ? [initialDocumentId] : []);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<(MemoireAnalysisResult & { creditsCharged: number }) | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const allDocuments = [...documents, ...extraDocuments];
  const usingDocuments = selectedIds.length > 0;
  const canSubmit = usingDocuments || text.trim().length > 50;
  const selectedTitles = allDocuments.filter((d) => selectedIds.includes(d.id)).map((d) => d.title);

  async function handleGenerate() {
    setIsLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/generate/memoire-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentIds: usingDocuments ? selectedIds : undefined,
          text: usingDocuments ? undefined : text,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(ERROR_MESSAGES[data.error] ?? "Une erreur est survenue.");
        return;
      }
      setResult(data);
      router.refresh();
    } catch {
      setError("Erreur réseau, réessaie.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-4">
        <h1 className="text-xl font-semibold">Analyse de mémoire</h1>
        {selectedTitles.length > 0 ? (
          <p className="text-sm text-muted-foreground">
            À partir de « {selectedTitles.join(" », « ")} » · à partir de {CREDIT_COSTS.memoire_analysis} crédits
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Choisis ton mémoire déjà importé, ou colle son contenu · à partir de {CREDIT_COSTS.memoire_analysis}{" "}
            crédits
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
            placeholder="Colle ici le contenu de ton mémoire (au moins quelques phrases)..."
            className="max-h-64 min-h-32 overflow-y-auto"
          />
        </div>
      )}

      <Button onClick={handleGenerate} disabled={!canSubmit || isLoading} className="mb-6 w-full sm:w-auto">
        {isLoading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
        Analyser
      </Button>

      {error && <p className="mb-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

      {isLoading && !result && (
        <p className="text-sm text-muted-foreground">
          Analyse en cours... ça peut prendre plusieurs minutes pour un mémoire long.
        </p>
      )}

      {result && (
        <>
          <p className="mb-3 text-xs font-medium text-primary">{result.creditsCharged} crédits facturés.</p>
          <MemoireAnalysisView result={result} />
        </>
      )}
    </div>
  );
}
