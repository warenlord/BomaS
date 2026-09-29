import { ThumbsUp, ThumbsDown, Layers, FlaskConical, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MemoireAnalysisResult {
  title: string;
  strengths: string[];
  weaknesses: string[];
  structureReview: string;
  methodologyReview: string;
  recommendations: string[];
  overallScore: number;
}

function scoreColor(score: number) {
  if (score >= 14) return "text-primary border-primary/30 bg-primary/5";
  if (score >= 10) return "text-amber-600 border-amber-500/30 bg-amber-500/5";
  return "text-destructive border-destructive/30 bg-destructive/5";
}

export function MemoireAnalysisView({ result }: { result: MemoireAnalysisResult }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold">{result.title}</h2>
        <div className={cn("rounded-2xl border px-4 py-2 text-center", scoreColor(result.overallScore))}>
          <p className="text-xl font-bold">{result.overallScore}/20</p>
        </div>
      </div>

      <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
        Cette analyse est une évaluation critique, pas une version corrigée : elle indique quoi améliorer, pas le
        texte à la place du tien.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
          <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-primary">
            <ThumbsUp className="size-4" />
            Points forts
          </p>
          <ul className="list-disc space-y-1 pl-4 text-sm">
            {result.strengths.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
          <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-destructive">
            <ThumbsDown className="size-4" />
            Points faibles
          </p>
          <ul className="list-disc space-y-1 pl-4 text-sm">
            {result.weaknesses.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="rounded-2xl border border-border/60 bg-card p-4">
        <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
          <Layers className="size-4 text-primary" />
          Structure
        </p>
        <p className="text-sm whitespace-pre-wrap text-muted-foreground">{result.structureReview}</p>
      </div>

      <div className="rounded-2xl border border-border/60 bg-card p-4">
        <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
          <FlaskConical className="size-4 text-primary" />
          Méthodologie
        </p>
        <p className="text-sm whitespace-pre-wrap text-muted-foreground">{result.methodologyReview}</p>
      </div>

      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
        <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-amber-700 dark:text-amber-400">
          <Lightbulb className="size-4" />
          Recommandations
        </p>
        <ul className="list-disc space-y-1 pl-4 text-sm">
          {result.recommendations.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
