import type { BattleWarrior as Warrior } from "@/lib/api/battlelog-types";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { BattleBreakdownTable } from "./battle-breakdown-table";
import { BATTLE_TEXT_COLORS } from "./utils/battle-color-palette";

interface DamageDealtBreakdownProps {
  warrior: Warrior;
}

export const DamageDealtBreakdown: FC<DamageDealtBreakdownProps> = ({
  warrior,
}) => {
  const { t } = useTranslation();
  const damageStats = [
    {
      type: t("battleUi.breakdowns.damageDealt.all"),
      value: warrior.damageDealt,
      color: BATTLE_TEXT_COLORS.neutral,
    },
    {
      type: t("battleUi.breakdowns.damageDealt.ranged"),
      value: warrior.distanceDamage,
      color: BATTLE_TEXT_COLORS.damage.distance,
    },
    {
      type: t("battleUi.breakdowns.damageDealt.physical"),
      value: warrior.meleeDamage,
      color: BATTLE_TEXT_COLORS.damage.melee,
    },
    {
      type: t("battleUi.breakdowns.damageDealt.auxiliary"),
      value: warrior.auxiliaryDamage,
      color: BATTLE_TEXT_COLORS.damage.auxiliary,
    },
    {
      type: t("battleUi.breakdowns.damageDealt.fire"),
      value: warrior.fireDamage,
      color: BATTLE_TEXT_COLORS.damage.fire,
    },
    {
      type: t("battleUi.breakdowns.damageDealt.cold"),
      value: warrior.frostDamage,
      color: BATTLE_TEXT_COLORS.damage.frost,
    },
    {
      type: t("battleUi.breakdowns.damageDealt.lightning"),
      value: warrior.lightningDamage,
      color: BATTLE_TEXT_COLORS.damage.lightning,
    },
    {
      type: t("battleUi.breakdowns.damageDealt.thirdAttack"),
      value: warrior.thirdAttDamage,
      color: BATTLE_TEXT_COLORS.damage.thirdAttack,
    },
    {
      type: t("battleUi.breakdowns.damageDealt.rage"),
      value: warrior.rageDamageDealt,
      color: BATTLE_TEXT_COLORS.damage.rage,
    },
    {
      type: t("battleUi.breakdowns.damageDealt.percent"),
      value: warrior.trueDamageDealt,
      color: BATTLE_TEXT_COLORS.damage.trueDamage,
    },
    {
      type: t("battleUi.breakdowns.damageDealt.stigma"),
      value: warrior.stigmaDamageDealt,
      color: BATTLE_TEXT_COLORS.damage.stigma,
    },
    {
      type: t("battleUi.breakdowns.damageDealt.reflected"),
      value: warrior.reflectedDamage,
      color: BATTLE_TEXT_COLORS.damage.reflected,
    },
  ].filter((item) => item.value > 0);

  if (damageStats.length === 0) {
    return (
      <div className="p-4 text-sm text-muted-foreground bg-background hover:bg-background">
        {t("battleUi.breakdowns.damageDealt.empty")}
      </div>
    );
  }

  return (
    <div className="p-4 bg-background hover:bg-background">
      <h4 className="font-semibold mb-3 text-sm">
        {t("battleUi.breakdowns.damageDealt.title", { name: warrior.name })}
      </h4>
      <p className="text-xs text-muted-foreground mb-2">
        {t("battleUi.breakdowns.damageDealt.note")}
      </p>
      <BattleBreakdownTable
        rows={damageStats}
        typeLabel={t("battleUi.breakdowns.headers.damageType")}
        valueLabel={t("battleUi.breakdowns.headers.value")}
      />
    </div>
  );
};
