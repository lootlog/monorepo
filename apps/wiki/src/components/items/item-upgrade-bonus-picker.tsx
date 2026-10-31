import { cn } from "cn";
import { t } from "@/i18n/messages";
import {
  UPGRADE_BONUS_GROUP_POWER,
  type UpgradeBonusKey,
  type UpgradeBonusOption,
} from "@/lib/item-upgrade";
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

const CARD =
  "relative flex cursor-pointer flex-col gap-2 rounded-lg border p-3 transition-[background-color,border-color,box-shadow] duration-200 has-focus-visible:ring-2 has-focus-visible:ring-ring motion-reduce:transition-none";

const cardState = (isChosen: boolean) =>
  isChosen
    ? "border-(--item-rarity) bg-[color-mix(in_oklab,var(--item-rarity)_12%,var(--card))] shadow-[0_0_24px_-8px_color-mix(in_oklab,var(--item-rarity)_60%,transparent)]"
    : "border-border bg-card hover:border-[color-mix(in_oklab,var(--item-rarity)_50%,var(--border))]";

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
      <label className={cn(CARD, "flex-row items-center", cardState(!value))}>
        <input
          type="radio"
          name="item-upgrade-bonus"
          checked={!value}
          onChange={() => onChange(undefined)}
          className="sr-only"
        />
        <span className="text-sm font-medium text-foreground">
          {t("upgrade.bonusNone")}
        </span>
      </label>
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
                  <label
                    key={option.key}
                    className={cn(CARD, cardState(isChosen))}
                  >
                    <input
                      type="radio"
                      name="item-upgrade-bonus"
                      value={option.key}
                      checked={isChosen}
                      onChange={() => onChange(option.key)}
                      className="sr-only"
                    />
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
                      <span className="text-[11px] text-muted-foreground tabular-nums">
                        {formatOfferChance(option.offerChance)}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        );
      })}
    </fieldset>
  );
}
