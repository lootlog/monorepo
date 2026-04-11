import type { EventWrappedRarityTotals } from "../../../hooks/queries/use-event-wrapped";
import { AnimatedPanel } from "./animated-panel";
import { MetricCard } from "./metric-card";
import { formatMetric } from "./utils";

interface RarityBreakdownProps {
  label: string;
  totals: EventWrappedRarityTotals;
  legendaryLabel: string;
  heroicLabel: string;
  uniqueLabel: string;
}

export const RarityBreakdown = ({
  label,
  totals,
  legendaryLabel,
  heroicLabel,
  uniqueLabel,
}: RarityBreakdownProps) => {
  return (
    <AnimatedPanel
      delay={0.04}
      className="rounded-[28px] border border-border/70 bg-background/70 p-4 backdrop-blur-sm"
    >
      <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
        {label}
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <MetricCard
          eyebrow={legendaryLabel}
          value={formatMetric(totals.legendary)}
          caption=""
          tone="danger"
        />
        <MetricCard
          eyebrow={heroicLabel}
          value={formatMetric(totals.heroic)}
          caption=""
          tone="blue"
        />
        <MetricCard
          eyebrow={uniqueLabel}
          value={formatMetric(totals.unique)}
          caption=""
          tone="yellow"
        />
      </div>
    </AnimatedPanel>
  );
};
