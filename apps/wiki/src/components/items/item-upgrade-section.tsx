import type { CatalogItemDtoOutput } from "@lootlog/client/search";
import { ArticleSection } from "@/components/article/article-section";
import { StatTiles } from "@/components/common/stat-tiles";
import { t } from "@/i18n/messages";
import {
  type ItemUpgrade,
  upgradeBonusOptions,
  upgradedItemLevel,
} from "@lootlog/domain/item-upgrade";
import type { StatChange } from "@/lib/stat-changes";
import { ItemUpgradeBonusPicker } from "./item-upgrade-bonus-picker";
import { ItemUpgradeChanges } from "./item-upgrade-changes";
import { ItemUpgradeCost } from "./item-upgrade-cost";
import { ItemUpgradeSteps } from "./item-upgrade-steps";

type ItemUpgradeSectionProps = {
  item: CatalogItemDtoOutput;
  upgrade: ItemUpgrade;
  changes: ReadonlyArray<StatChange>;
  onChange: (upgrade: ItemUpgrade) => void;
};

/**
 * Upgrading the item: the level, what the stats are computed at and what
 * changes, and the bonus a +5 item adds.
 */
export function ItemUpgradeSection({
  item,
  upgrade,
  changes,
  onChange,
}: ItemUpgradeSectionProps) {
  const effectiveLevel = upgradedItemLevel(item.lvl, upgrade.level);
  const bonuses = upgradeBonusOptions(item);

  const tiles = [
    { label: t("upgrade.itemLevel"), value: String(item.lvl) },
    {
      label: t("upgrade.effectiveLevel"),
      value: String(effectiveLevel),
      extra: effectiveLevel > item.lvl ? `+${effectiveLevel - item.lvl}` : null,
    },
    {
      label: t("upgrade.changedStats"),
      value: String(changes.length),
    },
  ];

  return (
    <div className="flex flex-col gap-8">
      <ArticleSection
        id="item-upgrade"
        title={t("upgrade.label")}
        description={t("upgrade.description")}
      >
        <ItemUpgradeSteps
          itemLevel={item.lvl}
          value={upgrade.level}
          onChange={(level) =>
            onChange({
              level,
              // The +5 bonus stays chosen only at +5.
              bonus: level === 5 ? upgrade.bonus : undefined,
            })
          }
        />
        <StatTiles tiles={tiles} />
      </ArticleSection>

      <section
        aria-labelledby="item-upgrade-changes"
        className="flex flex-col gap-3"
      >
        <h3
          id="item-upgrade-changes"
          className="text-base font-semibold text-foreground"
        >
          {t("upgrade.changes")}
        </h3>
        <ItemUpgradeChanges changes={changes} />
      </section>

      <ItemUpgradeCost item={item} level={upgrade.level} />

      {bonuses.length > 0 ? (
        <section
          aria-labelledby="item-upgrade-bonus"
          className="flex flex-col gap-3"
        >
          <div className="flex flex-col gap-1">
            <h3
              id="item-upgrade-bonus"
              className="text-base font-semibold text-foreground"
            >
              {t("upgrade.bonus")}
            </h3>
            <p className="text-sm text-pretty text-muted-foreground">
              {t("upgrade.bonusDescription")}
            </p>
          </div>
          <ItemUpgradeBonusPicker
            options={bonuses}
            value={upgrade.bonus}
            onChange={(bonus) =>
              onChange(bonus ? { level: 5, bonus } : { level: upgrade.level })
            }
          />
        </section>
      ) : null}
    </div>
  );
}
