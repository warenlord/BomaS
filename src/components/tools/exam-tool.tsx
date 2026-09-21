"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { UploadDropzone } from "@/components/documents/upload-dropzone";
import { DocumentPicker, type PickerDocument } from "@/components/tools/document-picker";
import { ExamView, type RedactedExam } from "@/components/tools/exam-view";
import { CREDIT_COSTS } from "@/lib/credits/costs";

const DURATIONS = [30, 60, 90, 120] as const;

const ERROR_MESSAGES: Record<string, string> = {
  UNAUTHORIZED: "Tu dois être connecté.",
  INSUFFICIENT_CREDITS: "Crédits insuffisants pour générer cet examen.",
  DOCUMENT_NOT_FOUND: "Document introuvable.",
  NO_SOURCE_TEXT: "Ajoute du texte ou choisis un document avec du contenu.",
  TEXT_TOO_LONG: "Le texte collé est trop long. Raccourcis-le ou utilise un document.",
  GENERATION_FAILED: "La génération a échoué. Réessaie.",
};

export function ExamTool({
  documents,
  initialDocumentId,
}: {
  documents: PickerDocument[];
  initialDocumentId?: string;
}) {
  const [duration, setDuration] = useState<number>(60);
  const [text, setText] = useState("");
  const [extraDocuments, setExtraDocuments] = useState<PickerDocument[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>(initialDocumentId ? [initialDocumentId] : []);
  const [isLoading, setIsLoading] = useState(false);
  const [exam, setExam] = useState<RedactedExam | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const allDocuments = [...documents, ...extraDocuments];
  const usingDocuments = selectedIds.length > 0;
  const canSubmit = usingDocuments || text.trim().length > 50;
  const selectedTitles = allDocuments.filter((d) => selectedIds.includes(d.id)).map((d) => d.title);

  async function handleGenerate() {
    setIsLoading(true);
    setError(null);
    setExam(null);
    try {
      const res = await fetch("/api/generate/exam", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentIds: usingDocuments ? selectedIds : undefined,
          text: usingDocuments ? undefined : text,
          durationMinutes: duration,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(ERROR_MESSAGES[data.error] ?? "Une erreur est survenue.");
        return;
      }
      setExam({ id: data.id, title: data.title, durationMinutes: data.durationMinutes, questions: data.questions });
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
        <h1 className="text-xl font-semibold">Examen blanc</h1>
        {selectedTitles.length > 0 ? (
          <p className="text-sm text-muted-foreground">
            À partir de « {selectedTitles.join(" », « ")} » · {CREDIT_COSTS.exam} crédits
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Choisis un ou plusieurs documents, ou colle un texte · {CREDIT_COSTS.exam} crédits
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

      <div className="mb-4 flex gap-2">
        {DURATIONS.map((d) => (
          <button
            key={d}
            type="button"
            disabled={isLoading}
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

      <Button onClick={handleGenerate} disabled={!canSubmit || isLoading} className="mb-6 w-full sm:w-auto">
        {isLoading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
        Générer
      </Button>

      {error && <p className="mb-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

      {isLoading && !exam && (
        <p className="text-sm text-muted-foreground">Génération en cours... ça peut prendre jusqu&apos;à une minute.</p>
      )}

      {exam && <ExamView exam={exam} />}
    </div>
  );
}
