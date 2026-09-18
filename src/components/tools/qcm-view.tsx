"use client";

import { useMemo, useState } from "react";
import type { DeepPartial } from "ai";
import { CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { QcmContent } from "@/lib/ai/prompts";
import { cn } from "@/lib/utils";

type PartialQcm = DeepPartial<QcmContent>;

export function QcmView({ object, savedId }: { object: PartialQcm | undefined; savedId: string | null }) {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<{ score: number; total: number } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const questions = useMemo(
    () =>
      (object?.questions ?? []).filter(
        (q): q is QcmContent["questions"][number] =>
          Boolean(q?.question) && Array.isArray(q?.options) && q.options.length === 4 && q.correctIndex !== undefined,
      ),
    [object],
  );

  if (questions.length === 0) return null;

  const allAnswered = questions.every((_, i) => answers[i] !== undefined);

  async function handleSubmit() {
    if (!savedId) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/qcm-attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          generatedContentId: savedId,
          answers: questions.map((_, i) => answers[i]),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult(data);
        setSubmitted(true);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      {object?.title && <h2 className="font-semibold">{object.title}</h2>}

      {result && (
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 text-center">
          <p className="text-2xl font-bold text-primary">
            {result.score} / {result.total}
          </p>
          <p className="text-sm text-muted-foreground">Score final</p>
        </div>
      )}

      {questions.map((q, i) => (
        <div key={i} className="rounded-2xl border border-border/60 bg-card p-4">
          <p className="mb-3 text-sm font-medium">
            {i + 1}. {q.question}
          </p>
          <div className="space-y-2">
            {q.options.map((option, optIndex) => {
              const isSelected = answers[i] === optIndex;
              const isCorrect = optIndex === q.correctIndex;
              const showFeedback = submitted;

              return (
                <button
                  key={optIndex}
                  type="button"
                  disabled={submitted}
                  onClick={() => setAnswers((prev) => ({ ...prev, [i]: optIndex }))}
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-sm transition-colors",
                    isSelected && !showFeedback && "border-primary bg-primary/5",
                    !isSelected && !showFeedback && "border-border hover:bg-muted/50",
                    showFeedback && isCorrect && "border-primary bg-primary/10",
                    showFeedback && isSelected && !isCorrect && "border-destructive bg-destructive/10",
                    showFeedback && !isSelected && !isCorrect && "border-border opacity-60",
                  )}
                >
                  <span>{option}</span>
                  {showFeedback && isCorrect && <CheckCircle2 className="size-4 shrink-0 text-primary" />}
                  {showFeedback && isSelected && !isCorrect && <XCircle className="size-4 shrink-0 text-destructive" />}
                </button>
              );
            })}
          </div>
          {submitted && q.explanation && (
            <p className="mt-3 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">{q.explanation}</p>
          )}
        </div>
      ))}

      {!submitted && (
        <Button onClick={handleSubmit} disabled={!allAnswered || !savedId || isSubmitting} className="w-full">
          Valider mes réponses
        </Button>
      )}
    </div>
  );
}
