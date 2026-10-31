import { cn } from "cn";
import { t } from "@/i18n/messages";
import {
  UPGRADE_LEVELS,
  type UpgradeLevel,
  upgradedItemLevel,
} from "@/lib/item-upgrade";

type ItemUpgradeStepsProps = {
  /** The item's own level, which the upgrade raises its stats from. */
  itemLevel: number;
  value: UpgradeLevel;
  onChange: (upgrade: UpgradeLevel) => void;
};

/**
 * The upgrade levels, +0 to +5, as one row of steps, each showing the level
 * the item's stats are computed at; the bar under them fills to the choice.
 */
export function ItemUpgradeSteps({
  itemLevel,
  value,
  onChange,
}: ItemUpgradeStepsProps) {
  const maxLevel = UPGRADE_LEVELS.at(-1) ?? 1;

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="sr-only">{t("upgrade.label")}</legend>
      <div className="grid grid-cols-6 gap-1.5 sm:gap-2">
        {UPGRADE_LEVELS.map((level) => {
          const isChosen = level === value;
          const isReached = level <= value;

          return (
            <label
              key={level}
              className={cn(
                "relative flex cursor-pointer flex-col items-center gap-0.5 rounded-lg border px-1 py-2.5 transition-[background-color,border-color,box-shadow] duration-200 has-focus-visible:ring-2 has-focus-visible:ring-ring motion-reduce:transition-none",
                isChosen
                  ? "border-(--item-rarity) bg-[color-mix(in_oklab,var(--item-rarity)_16%,var(--card))] shadow-[0_0_24px_-6px_color-mix(in_oklab,var(--item-rarity)_60%,transparent)]"
                  : isReached
                    ? "border-[color-mix(in_oklab,var(--item-rarity)_40%,var(--border))] bg-[color-mix(in_oklab,var(--item-rarity)_7%,var(--card))] hover:border-[color-mix(in_oklab,var(--item-rarity)_65%,var(--border))]"
                    : "border-border bg-card hover:border-[color-mix(in_oklab,var(--item-rarity)_50%,var(--border))]",
              )}
            >
              <input
                type="radio"
                name="item-upgrade"
                value={level}
                checked={isChosen}
                onChange={() => onChange(level)}
                className="sr-only"
              />
              <span
                className={cn(
                  "text-base font-semibold tabular-nums sm:text-lg",
                  isReached ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {t("upgrade.level", { level })}
              </span>
              <span className="text-[11px] text-muted-foreground tabular-nums sm:text-xs">
                {t("upgrade.effectiveLevelValue", {
                  level: upgradedItemLevel(itemLevel, level),
                })}
              </span>
            </label>
          );
        })}
      </div>
      <div
        aria-hidden="true"
        className="h-1.5 overflow-hidden rounded-full bg-muted"
      >
        <div
          className="h-full rounded-full bg-[linear-gradient(90deg,color-mix(in_oklab,var(--item-rarity)_45%,transparent),var(--item-rarity))] transition-[width] duration-300 ease-out motion-reduce:transition-none"
          style={{ width: `${(value / maxLevel) * 100}%` }}
        />
      </div>
    </fieldset>
  );
}
