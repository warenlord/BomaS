"use client";

import { useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface RedactedExam {
  id: string;
  title: string;
  durationMinutes: number;
  questions: { question: string; type: "qcm" | "open"; options: string[] | null; points: number }[];
}

interface Correction {
  type: "qcm" | "open";
  correctIndex: number | null;
  modelAnswer: string;
  points: number;
}

export function ExamView({ exam }: { exam: RedactedExam }) {
  const [qcmAnswers, setQcmAnswers] = useState<Record<number, number>>({});
  const [openAnswers, setOpenAnswers] = useState<Record<number, string>>({});
  const [corrections, setCorrections] = useState<Correction[] | null>(null);
  const [result, setResult] = useState<{ score: number; totalQcmPoints: number; totalPoints: number } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitted = corrections !== null;
  const allAnswered = exam.questions.every((q, i) =>
    q.type === "qcm" ? qcmAnswers[i] !== undefined : (openAnswers[i]?.trim().length ?? 0) > 0,
  );

  async function handleSubmit() {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/exam-attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          generatedContentId: exam.id,
          answers: exam.questions.map((_, i) => qcmAnswers[i] ?? null),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult({ score: data.score, totalQcmPoints: data.totalQcmPoints, totalPoints: data.totalPoints });
        setCorrections(data.corrections);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">{exam.title}</h2>
        <Badge variant="secondary">{exam.durationMinutes} min</Badge>
      </div>

      {result && (
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 text-center">
          <p className="text-2xl font-bold text-primary">
            {result.score} / {result.totalQcmPoints}
          </p>
          <p className="text-sm text-muted-foreground">
            Score sur les questions à choix multiples ({result.totalPoints} points au total avec les questions
            ouvertes — corrige-les toi-même à l&apos;aide du corrigé ci-dessous).
          </p>
        </div>
      )}

      {exam.questions.map((q, i) => {
        const correction = corrections?.[i];
        return (
          <div key={i} className="rounded-2xl border border-border/60 bg-card p-4">
            <div className="mb-3 flex items-start justify-between gap-2">
              <p className="text-sm font-medium">
                {i + 1}. {q.question}
              </p>
              <Badge variant="outline" className="shrink-0">
                {q.points} pt{q.points > 1 ? "s" : ""}
              </Badge>
            </div>

            {q.type === "qcm" && q.options && (
              <div className="space-y-2">
                {q.options.map((option, optIndex) => {
                  const isSelected = qcmAnswers[i] === optIndex;
                  const isCorrect = submitted && optIndex === correction?.correctIndex;

                  return (
                    <button
                      key={optIndex}
                      type="button"
                      disabled={submitted}
                      onClick={() => setQcmAnswers((prev) => ({ ...prev, [i]: optIndex }))}
                      className={cn(
                        "flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-sm transition-colors",
                        isSelected && !submitted && "border-primary bg-primary/5",
                        !isSelected && !submitted && "border-border hover:bg-muted/50",
                        submitted && isCorrect && "border-primary bg-primary/10",
                        submitted && isSelected && !isCorrect && "border-destructive bg-destructive/10",
                        submitted && !isSelected && !isCorrect && "border-border opacity-60",
                      )}
                    >
                      <span>{String.fromCharCode(65 + optIndex)}. {option}</span>
                      {submitted && isCorrect && <CheckCircle2 className="size-4 shrink-0 text-primary" />}
                      {submitted && isSelected && !isCorrect && (
                        <XCircle className="size-4 shrink-0 text-destructive" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {q.type === "open" && (
              <Textarea
                value={openAnswers[i] ?? ""}
                onChange={(e) => setOpenAnswers((prev) => ({ ...prev, [i]: e.target.value }))}
                disabled={submitted}
                placeholder="Écris ta réponse ici..."
                className="min-h-24"
              />
            )}

            {correction?.type === "open" && (
              <div className="mt-3 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
                <p className="mb-1 font-medium text-foreground">Corrigé type :</p>
                <p className="whitespace-pre-wrap">{correction.modelAnswer}</p>
              </div>
            )}
          </div>
        );
      })}

      {!submitted && (
        <Button onClick={handleSubmit} disabled={!allAnswered || isSubmitting} className="w-full">
          Rendre ma copie
        </Button>
      )}
    </div>
  );
}
