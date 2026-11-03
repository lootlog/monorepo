import { itemAttackSpeed } from "@lootlog/domain/attack-speed";
import { t } from "@/i18n/messages";
import { sumItemStats } from "@/lib/item-stat-totals";

/**
 * The attack speed the item adds, with its agility and all attributes
 * counted in, as the attack speed sort ranks it; nothing without any.
 */
export function ItemAttackSpeed({ stat }: { stat: string }) {
  const attackSpeed = itemAttackSpeed(sumItemStats([stat]));

  if (attackSpeed === 0) return null;

  return (
    <span
      className="shrink-0 font-medium text-foreground tabular-nums"
      title={t("catalog.attackSpeedHint")}
    >
      {t("catalog.attackSpeed", {
        value: attackSpeed.toLocaleString("pl-PL", {
          signDisplay: "always",
          maximumFractionDigits: 2,
        }),
      })}
    </span>
  );
}
