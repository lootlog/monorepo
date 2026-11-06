import { useState } from "react";
import { groupBy, sumBy } from "es-toolkit";
import {
  isUpgradable,
  itemUpgradeCost,
  UPGRADE_LEVELS,
} from "@lootlog/domain/item-upgrade";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@lootlog/ui/components/toggle-group";
import {
  ITEM_RARITIES_BY_VALUE,
  resolveItemRarity,
} from "@lootlog/ui/lib/item-rarity";
import { ArticleSection } from "@/components/article/article-section";
import { ItemNameLink } from "@/components/catalog/item-name-link";
import { StatTiles } from "@/components/common/stat-tiles";
import { useWornItems } from "@/hooks/use-worn-items";
import { t } from "@/i18n/messages";
import {
  formatAmount,
  formatGold,
  formatUpgradePoints,
  upgradeCurrencyName,
} from "@/lib/upgrade-cost-format";

const TARGETS = ["set", "max"] as const;

type Target = (typeof TARGETS)[number];

const MAX_LEVEL = UPGRADE_LEVELS.at(-1) ?? 5;

/**
 * What upgrading the worn items from +0 costs, to the levels the set has
 * them at or every one to +5: the totals, the breakdown currency of each
 * rarity apart, then each item's share.
 */
export function SetUpgradeCost() {
  const wornItems = useWornItems();
  const [target, setTarget] = useState<Target>("set");

  const rows = [...wornItems].map(([slotId, { item, upgrade }]) => {
    const level = target === "max" ? MAX_LEVEL : upgrade.level;

    return {
      slotId,
      item,
      upgrade,
      level,
      canUpgrade: isUpgradable(item),
      cost: itemUpgradeCost(item, level),
    };
  });

  if (rows.length === 0) return null;

  const byRarity = groupBy(rows, ({ item }) => resolveItemRarity(item.rarity));

  const currencyTiles = ITEM_RARITIES_BY_VALUE.flatMap((rarity) => {
    const essence = sumBy(byRarity[rarity] ?? [], ({ cost }) => cost.essence);

    return essence > 0
      ? [{ label: upgradeCurrencyName(rarity), value: formatAmount(essence) }]
      : [];
  });

  const points = sumBy(rows, ({ cost }) => cost.points);
  const gold = sumBy(rows, ({ cost }) => cost.gold);

  return (
    <ArticleSection
      id="set-page-upgrade-cost"
      title={t("setPage.upgradeCostTitle")}
      description={t("setPage.upgradeCostDescription")}
    >
      <ToggleGroup
        aria-label={t("setPage.upgradeCostTarget")}
        variant="outline"
        size="sm"
        spacing={1.5}
        value={[target]}
        // One target is always chosen: pressing it again keeps it.
        onValueChange={([pressed]) => {
          const next = TARGETS.find((value) => value === pressed);

          if (next) setTarget(next);
        }}
      >
        <ToggleGroupItem value="set">
          {t("setPage.upgradeCostToSet")}
        </ToggleGroupItem>
        <ToggleGroupItem value="max">
          {t("setPage.upgradeCostToMax")}
        </ToggleGroupItem>
      </ToggleGroup>

      {points === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
          {t("setPage.upgradeCostNone")}
        </p>
      ) : (
        <>
          <StatTiles
            className="grid-cols-2 sm:grid-cols-3 xl:grid-cols-4"
            tiles={[
              {
                label: t("upgrade.cost.points"),
                value: formatAmount(points),
              },
              { label: t("upgrade.cost.gold"), value: formatAmount(gold) },
              ...currencyTiles,
            ]}
          />
          <ul
            aria-label={t("setPage.upgradeCostItems")}
            className="divide-y divide-border/60 overflow-hidden rounded-lg border border-border bg-card"
          >
            {rows.map(({ slotId, item, upgrade, level, canUpgrade, cost }) => (
              <li
                key={slotId}
                className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2.5 text-sm"
              >
                <div className="flex min-w-0 items-baseline gap-2">
                  <span className="w-6 shrink-0 font-semibold text-foreground tabular-nums">
                    {t("upgrade.level", { level })}
                  </span>
                  <ItemNameLink item={item} upgrade={upgrade} highlight="" />
                </div>
                {canUpgrade ? (
                  <span className="text-muted-foreground tabular-nums">
                    <span className="font-medium text-foreground">
                      {formatUpgradePoints(cost.points)}
                    </span>
                    {level === MAX_LEVEL
                      ? ` ${t("upgrade.cost.maxStepExtras", {
                          essence: formatAmount(cost.essence),
                          currency: upgradeCurrencyName(item.rarity),
                          gold: formatGold(cost.gold),
                        })}`
                      : null}
                  </span>
                ) : (
                  <span className="text-muted-foreground">
                    {t("setPage.upgradeCostNotUpgradable")}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </ArticleSection>
  );
}
