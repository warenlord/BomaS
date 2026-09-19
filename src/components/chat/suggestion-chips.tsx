import { NotebookPen, ListChecks, Lightbulb, ClipboardCheck } from "lucide-react";

const SUGGESTIONS = [
  { icon: NotebookPen, label: "Résume-moi un cours", prompt: "Aide-moi à résumer un cours. Voici le sujet : " },
  { icon: ListChecks, label: "Crée un QCM", prompt: "Crée-moi un QCM de 10 questions sur : " },
  { icon: Lightbulb, label: "Explique simplement", prompt: "Explique-moi simplement, comme si j'étais débutant : " },
  { icon: ClipboardCheck, label: "Prépare un examen", prompt: "Aide-moi à préparer un examen sur : " },
];

export function SuggestionChips({ onSelect }: { onSelect: (prompt: string) => void }) {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {SUGGESTIONS.map((s) => (
        <button
          key={s.label}
          type="button"
          onClick={() => onSelect(s.prompt)}
          className="flex items-center gap-1.5 rounded-full border border-border/60 bg-card px-3.5 py-2 text-sm text-foreground/80 transition-colors hover:bg-muted"
        >
          <s.icon className="size-4 text-primary" />
          {s.label}
        </button>
      ))}
    </div>
  );
}
