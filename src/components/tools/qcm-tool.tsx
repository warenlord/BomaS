"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { UploadDropzone } from "@/components/documents/upload-dropzone";
import { QcmView, type RedactedQcm } from "@/components/tools/qcm-view";
import { CREDIT_COSTS } from "@/lib/credits/costs";

const QUESTION_COUNTS = [10, 20, 50] as const;

const ERROR_MESSAGES: Record<string, string> = {
  UNAUTHORIZED: "Tu dois être connecté.",
  INSUFFICIENT_CREDITS: "Crédits insuffisants pour générer ce QCM.",
  DOCUMENT_NOT_FOUND: "Document introuvable.",
  NO_SOURCE_TEXT: "Ajoute du texte ou choisis un document avec du contenu.",
  GENERATION_FAILED: "La génération a échoué. Réessaie.",
};

export function QcmTool({ documentId, documentTitle }: { documentId?: string; documentTitle?: string | null }) {
  const [questionCount, setQuestionCount] = useState<10 | 20 | 50>(10);
  const [text, setText] = useState("");
  const [uploadedDoc, setUploadedDoc] = useState<{ id: string; title: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [quiz, setQuiz] = useState<RedactedQcm | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Priorité : document venu de l'URL (?documentId=...) > document tout juste importé > texte collé.
  const activeDocumentId = documentId ?? uploadedDoc?.id;
  const activeDocumentTitle = documentTitle ?? uploadedDoc?.title;
  const canSubmit = Boolean(activeDocumentId) || text.trim().length > 50;

  async function handleGenerate() {
    setIsLoading(true);
    setError(null);
    setQuiz(null);
    try {
      const res = await fetch("/api/generate/qcm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId: activeDocumentId,
          text: activeDocumentId ? undefined : text,
          questionCount,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(ERROR_MESSAGES[data.error] ?? "Une erreur est survenue.");
        return;
      }
      setQuiz({ id: data.id, title: data.title, questions: data.questions });
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
        <h1 className="text-xl font-semibold">Générateur de QCM</h1>
        {activeDocumentTitle ? (
          <p className="text-sm text-muted-foreground">
            À partir de « {activeDocumentTitle} » · {CREDIT_COSTS.qcm} crédits
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Importe un fichier ou colle le contenu d&apos;un cours · {CREDIT_COSTS.qcm} crédits
          </p>
        )}
      </div>

      {!documentId &&
        (uploadedDoc ? (
          <div className="mb-4 flex items-center justify-between rounded-xl border border-border/60 bg-card px-4 py-3">
            <div className="flex min-w-0 items-center gap-2">
              <FileText className="size-4 shrink-0 text-primary" />
              <span className="truncate text-sm font-medium">{uploadedDoc.title}</span>
            </div>
            <button
              type="button"
              onClick={() => setUploadedDoc(null)}
              className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Retirer le document"
            >
              <X className="size-4" />
            </button>
          </div>
        ) : (
          <div className="mb-4 space-y-3">
            <UploadDropzone compact onUploaded={(doc) => setUploadedDoc(doc)} />
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
        ))}

      <div className="mb-4 flex gap-2">
        {QUESTION_COUNTS.map((count) => (
          <button
            key={count}
            type="button"
            disabled={isLoading}
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

      <Button onClick={handleGenerate} disabled={!canSubmit || isLoading} className="mb-6 w-full sm:w-auto">
        {isLoading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
        Générer
      </Button>

      {error && <p className="mb-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

      {isLoading && !quiz && (
        <p className="text-sm text-muted-foreground">
          Génération en cours... ça peut prendre jusqu&apos;à une minute pour {questionCount} questions.
        </p>
      )}

      {quiz && <QcmView quiz={quiz} />}
    </div>
  );
}
