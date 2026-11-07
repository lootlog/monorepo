import type { CatalogItemDtoOutput } from "@lootlog/client/catalog";
import { cn } from "cn";
import {
  itemUpgradeCost,
  UPGRADE_LEVELS,
  type UpgradeLevel,
} from "@lootlog/domain/item-upgrade";
import { StatTiles } from "@/components/common/stat-tiles";
import { t } from "@/i18n/messages";
import {
  formatAmount,
  formatGold,
  formatUpgradePoints,
  upgradeCurrencyName,
} from "@/lib/upgrade-cost-format";

type ItemUpgradeCostProps = {
  item: CatalogItemDtoOutput;
  /** The chosen upgrade; at +0 the cost of a full upgrade shows. */
  level: UpgradeLevel;
};

const MAX_LEVEL = UPGRADE_LEVELS.at(-1) ?? 5;

/**
 * What upgrading the item costs: everything up to the chosen level, then
 * each level's own points, the +5 step with its currency and gold.
 */
export function ItemUpgradeCost({ item, level }: ItemUpgradeCostProps) {
  const target = level === 0 ? MAX_LEVEL : level;
  const total = itemUpgradeCost(item, target);
  const currency = upgradeCurrencyName(item.rarity);

  const atMaxOnly =
    target < MAX_LEVEL ? t("upgrade.cost.atMaxOnly") : undefined;

  const costs = UPGRADE_LEVELS.map((step) => itemUpgradeCost(item, step));

  const steps = UPGRADE_LEVELS.slice(1).map((step) => {
    const cost = costs[step] ?? total;

    return {
      step,
      cost,
      points: cost.points - (costs[step - 1]?.points ?? 0),
    };
  });

  return (
    <section
      aria-labelledby="item-upgrade-cost"
      className="flex flex-col gap-3"
    >
      <div className="flex flex-col gap-1">
        <h3
          id="item-upgrade-cost"
          className="text-base font-semibold text-foreground"
        >
          {t("upgrade.cost.title")}
        </h3>
        <p className="text-sm text-pretty text-muted-foreground">
          {t("upgrade.cost.description")}
        </p>
      </div>

      <p className="text-sm font-medium text-foreground">
        {t("upgrade.cost.totalTo", { level: target })}
      </p>
      <StatTiles
        className="max-sm:grid-cols-1"
        tiles={[
          {
            label: t("upgrade.cost.points"),
            value: formatAmount(total.points),
          },
          {
            label: currency,
            value: formatAmount(total.essence),
            hint: atMaxOnly,
          },
          {
            label: t("upgrade.cost.gold"),
            value: formatAmount(total.gold),
            hint: atMaxOnly,
          },
        ]}
      />

      <ol
        aria-label={t("upgrade.cost.steps")}
        className="divide-y divide-border/60 overflow-hidden rounded-lg border border-border bg-card"
      >
        {steps.map(({ step, cost, points }) => (
          <li
            key={step}
            aria-current={step === level ? "step" : undefined}
            className={cn(
              "flex flex-wrap items-baseline gap-x-4 gap-y-1 px-4 py-2.5 text-sm",
              step === level &&
                "bg-[color-mix(in_oklab,var(--item-rarity)_10%,var(--card))]",
            )}
          >
            <span className="w-8 shrink-0 font-semibold text-foreground tabular-nums">
              {t("upgrade.level", { level: step })}
            </span>
            <span className="font-medium text-foreground tabular-nums">
              {formatUpgradePoints(points)}
            </span>
            <span className="text-muted-foreground tabular-nums">
              {t("upgrade.cost.cumulative", {
                value: formatAmount(cost.points),
              })}
            </span>
            {step === MAX_LEVEL ? (
              <span className="basis-full pl-12 text-muted-foreground tabular-nums">
                {t("upgrade.cost.maxStepExtras", {
                  essence: formatAmount(cost.essence),
                  currency,
                  gold: formatGold(cost.gold),
                })}
              </span>
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  );
}
