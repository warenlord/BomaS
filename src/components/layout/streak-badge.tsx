import { Flame } from "lucide-react";

export function StreakBadge({ days }: { days: number }) {
  return (
    <span
      title={`${days} jour${days > 1 ? "s" : ""} de révision d'affilée`}
      className="flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-xs font-semibold text-amber-600 dark:text-amber-400"
    >
      <Flame className="size-3.5" />
      {days}
    </span>
  );
}
