"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Maximize, Minimize, Clock } from "lucide-react";
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

function formatTime(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function ExamView({ exam }: { exam: RedactedExam }) {
  const [qcmAnswers, setQcmAnswers] = useState<Record<number, number>>({});
  const [openAnswers, setOpenAnswers] = useState<Record<number, string>>({});
  const [corrections, setCorrections] = useState<Correction[] | null>(null);
  const [result, setResult] = useState<{ score: number; totalQcmPoints: number; totalPoints: number } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(exam.durationMinutes * 60);

  const containerRef = useRef<HTMLDivElement>(null);
  const questionRefs = useRef<(HTMLDivElement | null)[]>([]);

  const submitted = corrections !== null;
  const isAnswered = (i: number) =>
    exam.questions[i].type === "qcm" ? qcmAnswers[i] !== undefined : (openAnswers[i]?.trim().length ?? 0) > 0;
  const allAnswered = exam.questions.every((_, i) => isAnswered(i));

  useEffect(() => {
    function handleFullscreenChange() {
      setIsFullscreen(Boolean(document.fullscreenElement));
    }
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  useEffect(() => {
    if (submitted || secondsLeft <= 0) return;
    const interval = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(interval);
  }, [submitted, secondsLeft]);

  async function toggleFullscreen() {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await containerRef.current?.requestFullscreen();
    }
  }

  function scrollToQuestion(i: number) {
    questionRefs.current[i]?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

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
        if (document.fullscreenElement) await document.exitFullscreen();
      } else {
        toast.error("La correction a échoué. Réessaie.");
      }
    } catch {
      toast.error("Erreur réseau, réessaie.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const totalSeconds = exam.durationMinutes * 60;
  const timeIsLow = !submitted && secondsLeft <= Math.min(300, totalSeconds * 0.2);

  return (
    <div ref={containerRef} className={cn("space-y-4", isFullscreen && "overflow-y-auto bg-background p-4")}>
      <div className="sticky top-0 z-10 -mx-1 flex flex-wrap items-center justify-between gap-2 bg-background/95 px-1 py-2 backdrop-blur">
        <h2 className="font-semibold">{exam.title}</h2>
        <div className="flex items-center gap-2">
          {!submitted && (
            <span
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold",
                timeIsLow ? "animate-pulse border-destructive/40 bg-destructive/10 text-destructive" : "border-border/60 bg-muted text-foreground",
              )}
            >
              <Clock className="size-3.5" />
              {formatTime(secondsLeft)}
            </span>
          )}
          <Badge variant="secondary">{exam.durationMinutes} min</Badge>
          <Button variant="outline" size="icon-sm" onClick={toggleFullscreen} aria-label="Plein écran">
            {isFullscreen ? <Minimize className="size-4" /> : <Maximize className="size-4" />}
          </Button>
        </div>
      </div>

      {!submitted && (
        <div className="flex flex-wrap gap-1.5">
          {exam.questions.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => scrollToQuestion(i)}
              className={cn(
                "flex size-7 items-center justify-center rounded-lg border text-xs font-medium transition-colors",
                isAnswered(i) ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted",
              )}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}

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
          <div
            key={i}
            ref={(el) => {
              questionRefs.current[i] = el;
            }}
            className="scroll-mt-20 rounded-2xl border border-border/60 bg-card p-4"
          >
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
