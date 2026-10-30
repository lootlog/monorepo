import { ArrowDown, ArrowUp } from "lucide-react";
import {
  type ItemDisplayValue,
  parseItemStats,
} from "@lootlog/ui/components/item-stat-utils";
import { renderItemStat } from "@/components/render-item-stat";
import { t } from "@/i18n/messages";

/** The first number of a stat's value; flags such as `binds` have none. */
const firstNumber = (value: string | boolean | undefined) =>
  Number.parseFloat(String(value));

/**
 * `renderItemStat` that marks each stat an upgrade raised or lowered from
 * `baseStat`. A legendary bonus only fades later, so it is left unmarked.
 */
export const renderStatChanges = (baseStat: string, stat: string) => {
  const base = new Map(
    parseItemStats(baseStat).map(({ key, value }) => [key, value]),
  );

  const changes = new Map(
    parseItemStats(stat).flatMap(({ key, value }) => {
      const before = base.get(key);

      if (key === "legbon" || before === undefined || before === value) {
        return [];
      }

      const delta = firstNumber(value) - firstNumber(before);

      return Number.isFinite(delta) && delta !== 0
        ? [[key, delta > 0 ? ("increased" as const) : ("decreased" as const)]]
        : [];
    }),
  );

  return (displayValue: ItemDisplayValue) => {
    const change = changes.get(displayValue.key?.split(".")[0] ?? "");
    const Icon = change === "decreased" ? ArrowDown : ArrowUp;

    if (!change) return renderItemStat(displayValue);

    return (
      <>
        {renderItemStat(displayValue)}{" "}
        <Icon
          aria-label={t(`upgrade.${change}`)}
          role="img"
          className="inline size-3 align-[-0.125em] text-emerald-400"
        />
      </>
    );
  };
};
