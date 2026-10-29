import { cn } from "cn";
import { renderItemStat } from "@/components/render-item-stat";
import { t } from "@/i18n/messages";
import { SUMMED_STAT_KEYS, type StatTotals } from "@/lib/item-stat-totals";

type EquipmentSetTotalsProps = {
  totals: StatTotals;
  /** The totals with the previewed item worn, shown as a change. */
  previewTotals: StatTotals | null;
};

const signed = (value: number) =>
  `${value > 0 ? "+" : "−"}${Math.abs(Math.round(value)).toLocaleString("pl-PL")}`;

/** The set's stats added up, with the change a previewed item would make. */
export function EquipmentSetTotals({
  totals,
  previewTotals,
}: EquipmentSetTotalsProps) {
  const keys = SUMMED_STAT_KEYS.filter(
    (key) => totals[key] !== undefined || previewTotals?.[key] !== undefined,
  );

  if (keys.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">{t("equipment.empty")}</p>
    );
  }

  return (
    <ul className="flex flex-col gap-1 text-xs">
      {keys.map((key) => {
        const total = totals[key] ?? 0;
        const change = previewTotals ? (previewTotals[key] ?? 0) - total : 0;

        return (
          <li key={key} className="flex items-baseline justify-between gap-2">
            <span className="min-w-0 truncate">
              {renderItemStat({ key, value: String(Math.round(total)) })}
            </span>
            {change !== 0 ? (
              <span
                className={cn(
                  "shrink-0 font-semibold tabular-nums",
                  change > 0 ? "text-signal-ready" : "text-destructive",
                )}
              >
                {signed(change)}
              </span>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
