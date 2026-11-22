import {
  itemStatAttackSpeed,
  type UpgradeBonusKey,
} from "@lootlog/domain/item-upgrade";
import { t } from "@/i18n/messages";
import { upgradeBonusName } from "@/lib/upgrade-bonus-text";
import { PRODUCT_LOCALE } from "@lootlog/domain/locale";

export type AttackSpeedRanking = "dropped" | "upgraded";

type ItemAttackSpeedProps = {
  stat: string;
  bonus?: UpgradeBonusKey;
};

export function ItemAttackSpeed({ stat, bonus }: ItemAttackSpeedProps) {
  const attackSpeed = itemStatAttackSpeed(stat);

  if (attackSpeed === 0) return null;

  const value = attackSpeed.toLocaleString(PRODUCT_LOCALE, {
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
