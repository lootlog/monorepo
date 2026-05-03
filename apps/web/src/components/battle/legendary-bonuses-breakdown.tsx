import type { BattleWarrior as Warrior } from "@/lib/api/battlelog-types";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { BattleBreakdownTable } from "./battle-breakdown-table";

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
      color: "text-yellow-400",
    },
    {
      type: t("battleUi.breakdowns.legendary.veryCrit"),
      value: warrior.legbonVerycrit,
      color: "text-red-600",
    },
    {
      type: t("battleUi.breakdowns.legendary.holyTouch"),
      value: warrior.legbonHolytouch,
      color: "text-blue-300",
    },
    {
      type: t("battleUi.breakdowns.legendary.anguish"),
      value: warrior.legbonAnguish,
      color: "text-red-600",
    },
  ].filter((item) => item.value > 0);

  const defensiveBonuses = [
    {
      type: t("battleUi.breakdowns.legendary.glare"),
      value: warrior.legbonGlare,
      color: "text-yellow-400",
    },
    {
      type: t("battleUi.breakdowns.legendary.cleanse"),
      value: warrior.legbonCleanse,
      color: "text-blue-400",
    },
    {
      type: t("battleUi.breakdowns.legendary.lastHeal"),
      value: warrior.legbonLastheal,
      color: "text-green-400",
    },
  ].filter((item) => item.value > 0);

  const passiveBonuses = [
    {
      type: t("battleUi.breakdowns.legendary.lastHealValue"),
      value: warrior.legbonLasthealValue,
      color: "text-gray-400",
    },
    {
      type: t("battleUi.breakdowns.legendary.facadeValue"),
      value: warrior.legbonFacadeValue,
      color: "text-sky-400",
    },
    {
      type: t("battleUi.breakdowns.legendary.critShieldValue"),
      value: warrior.legbonCritredValue,
      color: "text-sky-400",
    },
    {
      type: t("battleUi.breakdowns.legendary.punctureValue"),
      value: warrior.legbonPunctureValue,
      color: "text-red-300",
    },
    {
      type: t("battleUi.breakdowns.legendary.holyTouchHealing"),
      value: warrior.legbonHolytouchValue,
      color: "text-blue-300",
    },
    {
      type: t("battleUi.breakdowns.legendary.anguishDamage"),
      value: warrior.legbonAnguishDamageTaken,
      color: "text-red-600",
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
