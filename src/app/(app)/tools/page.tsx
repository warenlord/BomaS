import Link from "next/link";
import { redirect } from "next/navigation";
import { ListChecks, Layers, NotebookPen, FileStack, ClipboardCheck, GraduationCap } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getQuickStats } from "@/lib/stats/queries";
import { StatsStrip } from "@/components/tools/stats-strip";
import { CREDIT_COSTS } from "@/lib/credits/costs";

const TOOLS = [
  {
    href: "/tools/qcm",
    icon: ListChecks,
    title: "QCM",
    description: "10, 20 ou 50 questions avec corrections détaillées.",
    costLabel: `${CREDIT_COSTS.qcm} crédits`,
  },
  {
    href: "/tools/flashcards",
    icon: Layers,
    title: "Flashcards",
    description: "Des cartes recto/verso pour mémoriser rapidement.",
    costLabel: `${CREDIT_COSTS.flashcards} crédits`,
  },
  {
    href: "/tools/summary",
    icon: FileStack,
    title: "Résumé",
    description: "Un résumé clair et les points clés à retenir.",
    costLabel: `${CREDIT_COSTS.summary} crédits`,
  },
  {
    href: "/tools/revision-sheet",
    icon: NotebookPen,
    title: "Fiche de révision",
    description: "Une fiche structurée par sections, prête à réviser.",
    costLabel: `${CREDIT_COSTS.revision_sheet} crédits`,
  },
  {
    href: "/tools/exam",
    icon: ClipboardCheck,
    title: "Examen blanc",
    description: "Un examen chronométré avec corrigés types.",
    costLabel: `${CREDIT_COSTS.exam} crédits`,
  },
  {
    href: "/tools/memoire-analysis",
    icon: GraduationCap,
    title: "Analyse de mémoire",
    description: "Points forts/faibles, structure, méthodologie et note sur 20.",
    costLabel: `à partir de ${CREDIT_COSTS.memoire_analysis} crédits`,
  },
];

export default async function ToolsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const stats = await getQuickStats(supabase, user.id);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="mb-1 text-xl font-semibold">Outils de révision</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Colle le contenu d&apos;un cours ou pars d&apos;un document déjà importé.
      </p>

      <StatsStrip stats={stats} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {TOOLS.map((tool) => (
          <Link
            key={tool.href}
            href={tool.href}
            className="group flex flex-col gap-2 rounded-2xl border border-border/60 bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/10"
          >
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
              <tool.icon className="size-5" />
            </div>
            <p className="font-medium">{tool.title}</p>
            <p className="text-sm text-muted-foreground">{tool.description}</p>
            <p className="text-xs font-medium text-primary">{tool.costLabel}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
