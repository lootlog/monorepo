import type { CatalogItemDtoOutput } from "@lootlog/client/catalog";
import { ArticleSection } from "@/components/article/article-section";
import { StatsTile } from "@lootlog/ui/components/stats-tile";
import { StatsTileGrid } from "@lootlog/ui/components/stats-tile-grid";
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

export function ItemUpgradeSection({
  item,
  upgrade,
  changes,
  onChange,
}: ItemUpgradeSectionProps) {
  const effectiveLevel = upgradedItemLevel(item.lvl, upgrade.level);
  const bonuses = upgradeBonusOptions(item);

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
              ...upgrade,
              level,
              bonus: level === 5 ? upgrade.bonus : undefined,
            })
          }
        />
        <StatsTileGrid framed aria-live="polite" className="sm:grid-cols-3">
          <StatsTile label={t("upgrade.itemLevel")} value={item.lvl} />
          <StatsTile
            label={t("upgrade.effectiveLevel")}
            value={
              <>
                {effectiveLevel}
                {effectiveLevel > item.lvl ? (
                  <span className="ml-1.5 text-xs font-semibold text-signal-ready">
                    +{effectiveLevel - item.lvl}
                  </span>
                ) : null}
              </>
            }
          />
          <StatsTile label={t("upgrade.changedStats")} value={changes.length} />
        </StatsTileGrid>
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
              onChange(
                bonus
                  ? { ...upgrade, level: 5, bonus }
                  : { ...upgrade, bonus: undefined },
              )
            }
          />
        </section>
      ) : null}
    </div>
  );
}
