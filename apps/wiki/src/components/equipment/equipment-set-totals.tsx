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
  /** Whether the set has loaded, so a change of its totals is the User's. */
  isLoaded: boolean;
  /** `columns` sets the sections side by side, for a wide window. */
  layout?: "stack" | "columns";
};

/**
 * The set's stats added up as the game's character window lists them, by
 * section, with the change the User's last edit of the set made. Every stat
 * keeps a row that opens when the set has it.
 */
export function EquipmentSetTotals({
  totals,
  isLoaded,
  layout = "stack",
}: EquipmentSetTotalsProps) {
  const hasValue = (stat: Parameters<typeof setStatValue>[1]) =>
    setStatValue(totals, stat) !== undefined;

  const hasTotals = SET_STAT_SECTIONS.some(({ stats }) =>
    stats.some((stat) => setStatValue(totals, stat) !== undefined),
  );

  const caption = hasTotals ? t("equipment.totalsHint") : t("equipment.empty");

  return (
    <div
      className={cn(
        layout === "columns"
          ? "grid items-start gap-x-8 gap-y-5 @lg:grid-cols-2 @[54rem]:grid-cols-4"
          : "flex flex-col gap-3",
      )}
    >
      <p
        className={cn(
          layout === "columns" && "col-span-full",
          "text-xs text-pretty text-muted-foreground",
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
                  isLoaded={isLoaded}
                />
              ))}
            </dl>
          </section>
        );
      })}
    </div>
  );
}
