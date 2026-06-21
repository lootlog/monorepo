import type { BattleWarrior as Warrior } from "@/lib/api/battlelog-types";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { BattleBreakdownTable } from "./battle-breakdown-table";
import { BATTLE_TEXT_COLORS } from "./utils/battle-color-palette";

interface LegendaryBonusesBreakdownProps {
  warrior: Warrior;
}

export const LegendaryBonusesBreakdown: FC<LegendaryBonusesBreakdownProps> = ({
  warrior,
}) => {
  const { t } = useTranslation();
  const offensiveBonuses = [
    {
      type: t("battleUi.breakdowns.legendary.curse"),
      value: warrior.legbonCurse,
      color: BATTLE_TEXT_COLORS.legendary.curse,
    },
    {
      type: t("battleUi.breakdowns.legendary.veryCrit"),
      value: warrior.legbonVerycrit,
      color: BATTLE_TEXT_COLORS.legendary.veryCrit,
    },
    {
      type: t("battleUi.breakdowns.legendary.holyTouch"),
      value: warrior.legbonHolytouch,
      color: BATTLE_TEXT_COLORS.legendary.holyTouch,
    },
    {
      type: t("battleUi.breakdowns.legendary.anguish"),
      value: warrior.legbonAnguish,
      color: BATTLE_TEXT_COLORS.legendary.anguish,
    },
  ].filter((item) => item.value > 0);

  const defensiveBonuses = [
    {
      type: t("battleUi.breakdowns.legendary.glare"),
      value: warrior.legbonGlare,
      color: BATTLE_TEXT_COLORS.legendary.glare,
    },
    {
      type: t("battleUi.breakdowns.legendary.cleanse"),
      value: warrior.legbonCleanse,
      color: BATTLE_TEXT_COLORS.legendary.cleanse,
    },
    {
      type: t("battleUi.breakdowns.legendary.lastHeal"),
      value: warrior.legbonLastheal,
      color: BATTLE_TEXT_COLORS.legendary.lastHeal,
    },
  ].filter((item) => item.value > 0);

  const passiveBonuses = [
    {
      type: t("battleUi.breakdowns.legendary.lastHealValue"),
      value: warrior.legbonLasthealValue,
      color: BATTLE_TEXT_COLORS.muted,
    },
    {
      type: t("battleUi.breakdowns.legendary.facadeValue"),
      value: warrior.legbonFacadeValue,
      color: BATTLE_TEXT_COLORS.legendary.facade,
    },
    {
      type: t("battleUi.breakdowns.legendary.critShieldValue"),
      value: warrior.legbonCritredValue,
      color: BATTLE_TEXT_COLORS.legendary.critShield,
    },
    {
      type: t("battleUi.breakdowns.legendary.punctureValue"),
      value: warrior.legbonPunctureValue,
      color: BATTLE_TEXT_COLORS.legendary.puncture,
    },
    {
      type: t("battleUi.breakdowns.legendary.holyTouchHealing"),
      value: warrior.legbonHolytouchValue,
      color: BATTLE_TEXT_COLORS.legendary.holyTouch,
    },
    {
      type: t("battleUi.breakdowns.legendary.anguishDamage"),
      value: warrior.legbonAnguishDamageTaken,
      color: BATTLE_TEXT_COLORS.legendary.anguish,
    },
  ].filter((item) => item.value > 0);

  if (
    offensiveBonuses.length === 0 &&
    defensiveBonuses.length === 0 &&
    passiveBonuses.length === 0
  ) {
    return (
      <div className="p-4 text-sm bg-background text-muted-foreground">
        {t("battleUi.breakdowns.legendary.empty")}
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 bg-background hover:bg-background">
      <h4 className="font-semibold mb-3 text-sm">
        {t("battleUi.breakdowns.legendary.title", { name: warrior.name })}
      </h4>

      {offensiveBonuses.length > 0 && (
        <div>
          <h4 className="font-medium mb-2 text-sm">
            {t("battleUi.breakdowns.legendary.offensiveTitle")}
          </h4>
          <BattleBreakdownTable
            rows={offensiveBonuses}
            typeLabel={t("battleUi.breakdowns.headers.bonusType")}
            valueLabel={t("battleUi.breakdowns.headers.value")}
          />
        </div>
      )}

      {defensiveBonuses.length > 0 && (
        <div>
          <h5 className="font-medium mb-2 text-sm">
            {t("battleUi.breakdowns.legendary.defensiveTitle")}
          </h5>
          <BattleBreakdownTable
            rows={defensiveBonuses}
            typeLabel={t("battleUi.breakdowns.headers.bonusType")}
            valueLabel={t("battleUi.breakdowns.headers.value")}
          />
        </div>
      )}

      {passiveBonuses.length > 0 && (
        <div>
          <h5 className="font-medium mb-2 text-sm">
            {t("battleUi.breakdowns.legendary.passiveTitle")}
          </h5>
          <BattleBreakdownTable
            rows={passiveBonuses}
            typeLabel={t("battleUi.breakdowns.headers.bonusType")}
            valueLabel={t("battleUi.breakdowns.headers.value")}
          />
        </div>
      )}
    </div>
  );
};
