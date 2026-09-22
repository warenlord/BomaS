import { FileText, Sparkles, ListChecks } from "lucide-react";
import type { QuickStats } from "@/lib/stats/queries";

export function StatsStrip({ stats }: { stats: QuickStats }) {
  const items = [
    { icon: FileText, label: "Documents analysés", value: stats.documentsCount },
    { icon: Sparkles, label: "Contenus générés", value: stats.generatedContentCount },
    { icon: ListChecks, label: "Questions répondues", value: stats.questionsAnswered },
  ];

  return (
    <div className="mb-6 grid grid-cols-3 gap-3">
      {items.map((item) => (
        <div key={item.label} className="rounded-2xl border border-border/60 bg-card p-4">
          <item.icon className="mb-2 size-4 text-primary" />
          <p className="text-xl font-bold">{item.value}</p>
          <p className="text-xs text-muted-foreground">{item.label}</p>
        </div>
      ))}
    </div>
  );
}
