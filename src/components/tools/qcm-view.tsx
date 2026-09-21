"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface RedactedQcm {
  id: string;
  title: string;
  questions: { question: string; options: string[] }[];
}

interface Correction {
  correctIndex: number;
  explanation: string;
}

export function QcmView({ quiz }: { quiz: RedactedQcm }) {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [corrections, setCorrections] = useState<Correction[] | null>(null);
  const [result, setResult] = useState<{ score: number; total: number } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitted = corrections !== null;
  const allAnswered = quiz.questions.every((_, i) => answers[i] !== undefined);

  async function handleSubmit() {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/qcm-attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          generatedContentId: quiz.id,
          answers: quiz.questions.map((_, i) => answers[i]),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult({ score: data.score, total: data.total });
        setCorrections(data.corrections);
      } else {
        toast.error("La correction a échoué. Réessaie.");
      }
    } catch {
      toast.error("Erreur réseau, réessaie.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="font-semibold">{quiz.title}</h2>

      {result && (
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 text-center">
          <p className="text-2xl font-bold text-primary">
            {result.score} / {result.total}
          </p>
          <p className="text-sm text-muted-foreground">Score final</p>
        </div>
      )}

      {quiz.questions.map((q, i) => {
        const correction = corrections?.[i];
        return (
          <div key={i} className="rounded-2xl border border-border/60 bg-card p-4">
            <p className="mb-3 text-sm font-medium">
              {i + 1}. {q.question}
            </p>
            <div className="space-y-2">
              {q.options.map((option, optIndex) => {
                const isSelected = answers[i] === optIndex;
                const isCorrect = submitted && optIndex === correction?.correctIndex;

                return (
                  <button
                    key={optIndex}
                    type="button"
                    disabled={submitted}
                    onClick={() => setAnswers((prev) => ({ ...prev, [i]: optIndex }))}
                    className={cn(
                      "flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-sm transition-colors",
                      isSelected && !submitted && "border-primary bg-primary/5",
                      !isSelected && !submitted && "border-border hover:bg-muted/50",
                      submitted && isCorrect && "border-primary bg-primary/10",
                      submitted && isSelected && !isCorrect && "border-destructive bg-destructive/10",
                      submitted && !isSelected && !isCorrect && "border-border opacity-60",
                    )}
                  >
                    <span>{option}</span>
                    {submitted && isCorrect && <CheckCircle2 className="size-4 shrink-0 text-primary" />}
                    {submitted && isSelected && !isCorrect && <XCircle className="size-4 shrink-0 text-destructive" />}
                  </button>
                );
              })}
            </div>
            {correction?.explanation && (
              <p className="mt-3 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
                {correction.explanation}
              </p>
            )}
          </div>
        );
      })}

      {!submitted && (
        <Button onClick={handleSubmit} disabled={!allAnswered || isSubmitting} className="w-full">
          Valider mes réponses
        </Button>
      )}
    </div>
  );
}
