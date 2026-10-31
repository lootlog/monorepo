import type { CatalogItemDtoOutput } from "@lootlog/client/search";
import { t } from "@/i18n/messages";
import {
  type ItemUpgrade,
  upgradeBonusOptions,
  upgradedItemLevel,
} from "@/lib/item-upgrade";
import type { StatChange } from "@/lib/stat-changes";
import { ItemUpgradeBonusPicker } from "./item-upgrade-bonus-picker";
import { ItemUpgradeChanges } from "./item-upgrade-changes";
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
    { label: t("upgrade.itemLevel"), value: String(item.lvl), extra: null },
    {
      label: t("upgrade.effectiveLevel"),
      value: String(effectiveLevel),
      extra: effectiveLevel > item.lvl ? `+${effectiveLevel - item.lvl}` : null,
    },
    {
      label: t("upgrade.changedStats"),
      value: String(changes.length),
      extra: null,
    },
  ];

  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="item-upgrade" className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2
            id="item-upgrade"
            className="text-lg font-semibold tracking-tight text-foreground"
          >
            {t("upgrade.label")}
          </h2>
          <p className="text-sm text-pretty text-muted-foreground">
            {t("upgrade.description")}
          </p>
        </div>
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
        <dl className="grid grid-cols-3 gap-2">
          {tiles.map(({ label, value, extra }) => (
            <div
              key={label}
              className="flex flex-col gap-1 rounded-lg border border-border bg-card px-3 py-2.5"
            >
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className="flex items-baseline gap-1.5">
                <span
                  aria-live="polite"
                  className="text-xl font-semibold text-foreground tabular-nums"
                >
                  {value}
                </span>
                {extra ? (
                  <span className="text-xs font-semibold text-emerald-400 tabular-nums">
                    {extra}
                  </span>
                ) : null}
              </dd>
            </div>
          ))}
        </dl>
      </section>

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
