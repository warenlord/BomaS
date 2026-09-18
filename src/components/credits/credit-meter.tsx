import { Progress } from "@/components/ui/progress";
import { formatCredits } from "@/lib/format";
import type { CreditUsageStats } from "@/lib/credits/ledger";
import { cn } from "@/lib/utils";

function Gauge({ label, percent, detail }: { label: string; percent: number; detail: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between text-xs">
        <span className="font-medium text-foreground">{label}</span>
        <span className="text-muted-foreground">{detail}</span>
      </div>
      <Progress
        value={Math.min(100, percent)}
        className={cn(percent >= 90 && "[&_[data-slot=progress-indicator]]:bg-destructive")}
      />
    </div>
  );
}

export function CreditMeter({ stats, compact = false }: { stats: CreditUsageStats; compact?: boolean }) {
  return (
    <div className={cn("space-y-3", compact && "space-y-2")}>
      <Gauge
        label="Ce mois"
        percent={stats.monthlyPercentUsed}
        detail={`${formatCredits(stats.balance)} / ${formatCredits(stats.monthlyAllowance)} crédits`}
      />
      {!compact && (
        <>
          <Gauge
            label="Cette semaine"
            percent={stats.weeklyPercentUsed}
            detail={`${formatCredits(stats.usedThisWeek)} / ${formatCredits(stats.weeklyBudget)}`}
          />
          <Gauge
            label="Aujourd'hui"
            percent={stats.dailyPercentUsed}
            detail={`${formatCredits(stats.usedToday)} / ${formatCredits(stats.dailyBudget)}`}
          />
        </>
      )}
    </div>
  );
}
