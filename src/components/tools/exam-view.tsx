import type { DeepPartial } from "ai";
import { Badge } from "@/components/ui/badge";
import type { ExamContent } from "@/lib/ai/prompts";

export function ExamView({ object }: { object: DeepPartial<ExamContent> | undefined }) {
  const questions = (object?.questions ?? []).filter((q): q is ExamContent["questions"][number] =>
    Boolean(q?.question && q?.modelAnswer),
  );

  if (questions.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        {object?.title && <h2 className="font-semibold">{object.title}</h2>}
        {object?.durationMinutes && <Badge variant="secondary">{object.durationMinutes} min</Badge>}
      </div>

      {questions.map((q, i) => (
        <div key={i} className="rounded-2xl border border-border/60 bg-card p-4">
          <div className="mb-2 flex items-start justify-between gap-2">
            <p className="text-sm font-medium">
              {i + 1}. {q.question}
            </p>
            <Badge variant="outline" className="shrink-0">
              {q.points} pt{q.points > 1 ? "s" : ""}
            </Badge>
          </div>

          {q.type === "qcm" && q.options && (
            <ul className="mb-2 space-y-1 text-sm text-muted-foreground">
              {q.options.map((opt, optIndex) => (
                <li key={optIndex} className={optIndex === q.correctIndex ? "font-medium text-primary" : undefined}>
                  {String.fromCharCode(65 + optIndex)}. {opt}
                </li>
              ))}
            </ul>
          )}

          <details className="text-sm">
            <summary className="cursor-pointer text-xs font-medium text-primary">Voir le corrigé</summary>
            <p className="mt-2 rounded-lg bg-muted px-3 py-2 text-sm whitespace-pre-wrap">{q.modelAnswer}</p>
          </details>
        </div>
      ))}
    </div>
  );
}
