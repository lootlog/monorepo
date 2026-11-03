import {
  itemStatAttackSpeed,
  type UpgradeBonusKey,
} from "@lootlog/domain/item-upgrade";
import { t } from "@/i18n/messages";
import { upgradeBonusName } from "@/lib/upgrade-bonus-text";

/** Which attack speed a list ranked by it shows: as dropped or at +5. */
export type AttackSpeedRanking = "dropped" | "upgraded";

type ItemAttackSpeedProps = {
  /** The item's stats as the list ranks it, upgraded or as dropped. */
  stat: string;
  /** The +5 bonus the ranking gave the item. */
  bonus?: UpgradeBonusKey;
};

/**
 * The attack speed the item adds, with its agility and all attributes
 * counted in, as the list's attack speed sort ranks it: as dropped, or at +5
 * with the bonus that adds the most; nothing without any.
 */
export function ItemAttackSpeed({ stat, bonus }: ItemAttackSpeedProps) {
  const attackSpeed = itemStatAttackSpeed(stat);

  if (attackSpeed === 0) return null;

  const value = attackSpeed.toLocaleString("pl-PL", {
    signDisplay: "always",
    maximumFractionDigits: 2,
  });

  return (
    <span
      className="shrink-0 font-medium text-foreground tabular-nums"
      title={
        bonus
          ? t("catalog.upgradedAttackSpeedHint", {
              bonus: upgradeBonusName(bonus),
            })
          : t("catalog.attackSpeedHint")
      }
    >
      {bonus
        ? t("catalog.upgradedAttackSpeed", { value })
        : t("catalog.attackSpeed", { value })}
    </span>
  );
}
