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
} from "@lootlog/domain/item-rarity";
import { ArticleSection } from "@/components/article/article-section";
import { ItemNameLink } from "@/components/catalog/item-name-link";
import { StatsTile } from "@lootlog/ui/components/stats-tile";
import { StatsTileGrid } from "@lootlog/ui/components/stats-tile-grid";
import { useWornItems } from "@/hooks/use-worn-items";
import { t } from "@/i18n/messages";
import {
  formatGold,
  formatUpgradePoints,
  upgradeCurrencyName,
} from "@/lib/upgrade-cost-format";
import { formatNumber } from "@lootlog/domain/locale";
import { EmptyNotice } from "@/components/common/empty-notice";

const TARGETS = ["set", "max"] as const;

type Target = (typeof TARGETS)[number];

const MAX_LEVEL = UPGRADE_LEVELS.at(-1) ?? 5;

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

  const byRarity = groupBy(rows, ({ item }) => resolveItemRarity(item.rarity));

  const currencyTiles = ITEM_RARITIES_BY_VALUE.flatMap((rarity) => {
    const essence = sumBy(byRarity[rarity] ?? [], ({ cost }) => cost.essence);

    return essence > 0
      ? [{ label: upgradeCurrencyName(rarity), value: formatNumber(essence) }]
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

      {rows.length === 0 ? (
        <EmptyNotice>{t("setPage.noItems")}</EmptyNotice>
      ) : points === 0 ? (
        <EmptyNotice>{t("setPage.upgradeCostNone")}</EmptyNotice>
      ) : (
        <>
          <StatsTileGrid
            framed
            aria-live="polite"
            className="sm:grid-cols-2 xl:grid-cols-4"
          >
            <StatsTile
              label={t("upgrade.cost.points")}
              value={formatNumber(points)}
            />
            <StatsTile
              label={t("upgrade.cost.gold")}
              value={formatGold(gold)}
            />
            {currencyTiles.map((tile) => (
              <StatsTile
                key={tile.label}
                label={tile.label}
                value={tile.value}
              />
            ))}
          </StatsTileGrid>
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
                          essence: formatNumber(cost.essence),
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
