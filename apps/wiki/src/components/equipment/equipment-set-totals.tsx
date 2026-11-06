import { cn } from "cn";
import { t } from "@/i18n/messages";
import {
  SET_STAT_SECTIONS,
  setStatValue,
  type StatTotals,
} from "@/lib/item-stat-totals";
import { EquipmentStatRow } from "./equipment-stat-row";

type EquipmentSetTotalsProps = {
  totals: StatTotals;
  /** The totals with the previewed item worn, shown as a change. */
  previewTotals: StatTotals | null;
  /** The previewed item's name, while one is previewed. */
  previewName: string | null;
};

/**
 * The set's stats added up as the game's character window lists them, by
 * section, with the change a previewed item would make. Every stat keeps a
 * row that opens when the set or the preview has it.
 */
export function EquipmentSetTotals({
  totals,
  previewTotals,
  previewName,
}: EquipmentSetTotalsProps) {
  const hasValue = (stat: Parameters<typeof setStatValue>[1]) =>
    setStatValue(totals, stat) !== undefined ||
    (previewTotals !== null && setStatValue(previewTotals, stat) !== undefined);

  const hasTotals = SET_STAT_SECTIONS.some(({ stats }) =>
    stats.some((stat) => setStatValue(totals, stat) !== undefined),
  );

  const caption =
    previewName !== null
      ? t("equipment.previewing", { item: previewName })
      : hasTotals
        ? t("equipment.previewHint")
        : t("equipment.empty");

  return (
    <div className="flex flex-col gap-3">
      <p
        aria-live="polite"
        className={cn(
          "text-xs text-pretty transition-colors duration-200 motion-reduce:transition-none",
          previewName === null
            ? "text-muted-foreground"
            : "font-medium text-foreground",
        )}
      >
        {caption}
      </p>
      {SET_STAT_SECTIONS.map((section) => {
        const isShown = section.stats.some(hasValue);

        return (
          <section
            key={section.id}
            aria-labelledby={`set-stats-${section.id}`}
            hidden={!isShown}
            className="flex flex-col gap-1"
          >
            <h3
              id={`set-stats-${section.id}`}
              className="border-b border-border/50 pb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase"
            >
              {t(`setStats.sections.${section.id}`)}
            </h3>
            <dl className="flex flex-col">
              {section.stats.map((stat) => (
                <EquipmentStatRow
                  key={stat.id}
                  label={t(`setStats.stats.${stat.id}`)}
                  unit={"unit" in stat ? stat.unit : ""}
                  total={setStatValue(totals, stat)}
                  previewTotal={
                    previewTotals === null
                      ? null
                      : setStatValue(previewTotals, stat)
                  }
                />
              ))}
            </dl>
          </section>
        );
      })}
    </div>
  );
}
