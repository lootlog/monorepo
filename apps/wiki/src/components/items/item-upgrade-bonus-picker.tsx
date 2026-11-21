import { ChoiceCard } from "@/components/common/choice-card";
import { t } from "@/i18n/messages";
import {
  UPGRADE_BONUS_GROUP_POWER,
  type UpgradeBonusKey,
  type UpgradeBonusOption,
} from "@lootlog/domain/item-upgrade";
import {
  formatOfferChance,
  formatUpgradeBonusValue,
  upgradeBonusName,
} from "@/lib/upgrade-bonus-text";

type ItemUpgradeBonusPickerProps = {
  options: ReadonlyArray<UpgradeBonusOption>;
  value: UpgradeBonusKey | undefined;
  onChange: (bonus: UpgradeBonusKey | undefined) => void;
};

/**
 * The extra bonus a +5 item can draw, grouped by how often the game offers
 * it, each card with its value at +5 and its chance to be among the three
 * offered. Choosing one upgrades the item to +5.
 */
export function ItemUpgradeBonusPicker({
  options,
  value,
  onChange,
}: ItemUpgradeBonusPickerProps) {
  return (
    <fieldset className="flex flex-col gap-4">
      <legend className="sr-only">{t("upgrade.bonus")}</legend>
      <ChoiceCard
        name="item-upgrade-bonus"
        value=""
        checked={!value}
        onChange={() => onChange(undefined)}
        className="flex-row items-center"
      >
        <span className="text-sm font-medium text-foreground">
          {t("upgrade.bonusNone")}
        </span>
      </ChoiceCard>
      {UPGRADE_BONUS_GROUP_POWER.map((_power, group) => {
        const groupOptions = options.filter((option) => option.group === group);

        return (
          <div key={group} className="flex flex-col gap-2">
            <h4 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {t(`upgrade.bonusGroups.${group}`)}
            </h4>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(9.5rem,1fr))] gap-2">
              {groupOptions.map((option) => {
                const isChosen = option.key === value;

                return (
                  <ChoiceCard
                    key={option.key}
                    name="item-upgrade-bonus"
                    value={option.key}
                    checked={isChosen}
                    onChange={() => onChange(option.key)}
                  >
                    <span className="text-xs leading-tight text-muted-foreground">
                      {upgradeBonusName(option.key)}
                    </span>
                    <span className="text-lg leading-none font-semibold text-foreground tabular-nums">
                      {formatUpgradeBonusValue(option)}
                    </span>
                    <span className="flex flex-col gap-1">
                      <span
                        aria-hidden="true"
                        className="h-1 overflow-hidden rounded-full bg-muted"
                      >
                        <span
                          className="block h-full rounded-full bg-(--item-rarity)"
                          style={{ width: `${option.offerChance * 100}%` }}
                        />
                      </span>
                      <span className="text-2xs text-muted-foreground tabular-nums">
                        {formatOfferChance(option.offerChance)}
                      </span>
                    </span>
                  </ChoiceCard>
                );
              })}
            </div>
          </div>
        );
      })}
    </fieldset>
  );
}
