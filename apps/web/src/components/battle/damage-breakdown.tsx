import type { BattleWarrior as Warrior } from "@/lib/api/battlelog-types";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { BattleBreakdownTable } from "./battle-breakdown-table";
import { BATTLE_TEXT_COLORS } from "./utils/battle-color-palette";

interface DamageBreakdownProps {
  warrior: Warrior;
}

export const DamageBreakdown: FC<DamageBreakdownProps> = ({ warrior }) => {
  const { t } = useTranslation();
  const damageBreakdown = [
    {
      type: t("battleUi.breakdowns.damageTaken.all"),
      value: warrior.damageTaken,
      color: BATTLE_TEXT_COLORS.neutral,
    },
    {
      type: t("battleUi.breakdowns.damageTaken.ranged"),
      value: warrior.distanceDamageTaken,
      color: BATTLE_TEXT_COLORS.damage.distance,
    },
    {
      type: t("battleUi.breakdowns.damageTaken.physical"),
      value: warrior.meleeDamageTaken,
      color: BATTLE_TEXT_COLORS.damage.melee,
    },
    {
      type: t("battleUi.breakdowns.damageTaken.auxiliary"),
      value: warrior.auxiliaryDamageTaken,
      color: BATTLE_TEXT_COLORS.damage.auxiliary,
    },
    {
      type: t("battleUi.breakdowns.damageTaken.fire"),
      value: warrior.fireDamageTaken,
      color: BATTLE_TEXT_COLORS.damage.fire,
    },
    {
      type: t("battleUi.breakdowns.damageTaken.ice"),
      value: warrior.frostDamageTaken,
      color: BATTLE_TEXT_COLORS.damage.frost,
    },
    {
      type: t("battleUi.breakdowns.damageTaken.lightning"),
      value: warrior.lightningDamageTaken,
      color: BATTLE_TEXT_COLORS.damage.lightning,
    },
    {
      type: t("battleUi.breakdowns.damageTaken.thirdAttack"),
      value: warrior.thirdAttDamageTaken,
      color: BATTLE_TEXT_COLORS.damage.thirdAttack,
    },
    {
      type: t("battleUi.breakdowns.damageTaken.percent"),
      value: warrior.trueDamageTaken,
      color: BATTLE_TEXT_COLORS.damage.trueDamage,
    },
    {
      type: t("battleUi.breakdowns.damageTaken.stigma"),
      value: warrior.stigmaDamageTaken,
      color: BATTLE_TEXT_COLORS.damage.stigma,
    },
    {
      type: t("battleUi.breakdowns.damageTaken.wound"),
      value: warrior.woundDamageTaken,
      color: BATTLE_TEXT_COLORS.damage.wound,
    },
    {
      type: t("battleUi.breakdowns.damageTaken.poison"),
      value: warrior.poisonDamageTaken,
      color: BATTLE_TEXT_COLORS.damage.poison,
    },
    {
      type: t("battleUi.breakdowns.damageTaken.injure"),
      value: warrior.injureDamageTaken,
      color: BATTLE_TEXT_COLORS.damage.injure,
    },
    {
      type: t("battleUi.breakdowns.damageTaken.criticalWound"),
      value: warrior.critWoundDamageTaken,
      color: BATTLE_TEXT_COLORS.damage.criticalWound,
    },
    {
      type: t("battleUi.breakdowns.damageTaken.firePassive"),
      value: warrior.firePassiveDamageTaken,
      color: BATTLE_TEXT_COLORS.damage.firePassive,
    },
    {
      type: t("battleUi.breakdowns.damageTaken.lightningPassive"),
      value: warrior.lightningPassiveDamageTaken,
      color: BATTLE_TEXT_COLORS.damage.lightningPassive,
    },
  ].filter((item) => item.value > 0);

  if (damageBreakdown.length === 0) {
    return (
      <div className="p-4 text-sm text-muted-foreground bg-background hover:bg-background">
        {t("battleUi.breakdowns.damageTaken.empty")}
      </div>
    );
  }

  return (
    <div className="p-4 bg-background hover:bg-background">
      <h4 className="font-semibold mb-3 text-sm">
        {t("battleUi.breakdowns.damageTaken.title", { name: warrior.name })}
      </h4>
      <BattleBreakdownTable
        rows={damageBreakdown}
        typeLabel={t("battleUi.breakdowns.headers.damageType")}
        valueLabel={t("battleUi.breakdowns.headers.value")}
      />
    </div>
  );
};
