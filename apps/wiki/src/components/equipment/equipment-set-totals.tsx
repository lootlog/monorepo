import { cn } from "cn";
import { t } from "@/i18n/messages";
import { SUMMED_STAT_KEYS, type StatTotals } from "@/lib/item-stat-totals";
import { EquipmentStatRow } from "./equipment-stat-row";

type EquipmentSetTotalsProps = {
  totals: StatTotals;
  /** The totals with the previewed item worn, shown as a change. */
  previewTotals: StatTotals | null;
  /** The previewed item's name, while one is previewed. */
  previewName: string | null;
};

/**
 * The set's stats added up, with the change a previewed item would make.
 * Every stat keeps a row that opens when the set or the preview has it.
 */
export function EquipmentSetTotals({
  totals,
  previewTotals,
  previewName,
}: EquipmentSetTotalsProps) {
  const hasTotals = SUMMED_STAT_KEYS.some((key) => totals[key] !== undefined);

  const caption =
    previewName !== null
      ? t("equipment.previewing", { item: previewName })
      : hasTotals
        ? t("equipment.previewHint")
        : t("equipment.empty");

  return (
    <div className="flex flex-col gap-2 text-xs">
      <p
        aria-live="polite"
        className={cn(
          "line-clamp-2 min-h-8 transition-colors duration-200 motion-reduce:transition-none",
          previewName === null
            ? "text-muted-foreground"
            : "font-medium text-foreground",
        )}
      >
        {caption}
      </p>
      <ul className="flex flex-col">
        {SUMMED_STAT_KEYS.map((key) => (
          <EquipmentStatRow
            key={key}
            statKey={key}
            total={totals[key]}
            previewTotal={previewTotals === null ? null : previewTotals[key]}
          />
        ))}
      </ul>
    </div>
  );
}
