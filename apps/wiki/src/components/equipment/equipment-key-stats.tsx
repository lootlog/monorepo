import { cn } from "cn";
import { useSetSummary } from "@/hooks/use-set-summary";
import { t } from "@/i18n/messages";
import {
  SET_STAT_SECTIONS,
  type SetStatDefinition,
  setStatValue,
} from "@/lib/item-stat-totals";

// The stats players compare first in a group fight.
const KEY_STATS = ["sa", "hp", "ac", "evade", "crit"];

const stats = SET_STAT_SECTIONS.flatMap(
  (section): readonly SetStatDefinition[] => section.stats,
).filter(({ id }) => KEY_STATS.includes(id));

const format = (value: number) =>
  value.toLocaleString("pl-PL", { maximumFractionDigits: 2 });

/** A few of the set's stats in a row, with the change a preview makes. */
export function EquipmentKeyStats({ className }: { className?: string }) {
  const { totals, previewTotals } = useSetSummary();

  return (
    <dl className={cn("flex items-center gap-5", className)}>
      {stats.map((stat) => {
        const unit = "unit" in stat ? stat.unit : "";
        const value = setStatValue(totals, stat) ?? 0;

        const next =
          previewTotals === null
            ? value
            : (setStatValue(previewTotals, stat) ?? 0);

        const change = next - value;

        return (
          <div key={stat.id} className="flex flex-col leading-tight">
            <dt className="text-[0.6875rem] text-muted-foreground">
              {t(`setStats.stats.${stat.id}`)}
            </dt>
            <dd className="flex items-baseline gap-1.5 text-sm font-semibold text-foreground tabular-nums">
              {format(next)}
              {unit}
              {change === 0 ? null : (
                <span
                  className={cn(
                    "text-xs",
                    change > 0 ? "text-signal-ready" : "text-destructive",
                  )}
                >
                  {change > 0 ? "+" : "−"}
                  {format(Math.abs(change))}
                  {unit}
                </span>
              )}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
