import { Badge } from "@/components/ui/badge";
import type { DocumentStatus } from "@/lib/types/database.types";
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<DocumentStatus, { label: string; className: string }> = {
  pending: { label: "En attente", className: "bg-muted text-muted-foreground" },
  processing: { label: "Analyse en cours", className: "bg-accent text-accent-foreground" },
  ready: { label: "Prêt", className: "bg-primary/10 text-primary" },
  error: { label: "Erreur", className: "bg-destructive/10 text-destructive" },
};

export function DocumentStatusBadge({ status }: { status: DocumentStatus }) {
  const config = STATUS_CONFIG[status];
  return <Badge className={cn("border-0", config.className)}>{config.label}</Badge>;
}
