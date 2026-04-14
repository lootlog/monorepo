import type { Warrior } from "@/hooks/api/battle-log/use-battles";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { BreakdownTable } from "./breakdown-table";

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
      color: "text-white",
    },
    {
      type: t("battleUi.breakdowns.damageDealt.ranged"),
      value: warrior.distanceDamage,
      color: "text-green-400",
    },
    {
      type: t("battleUi.breakdowns.damageDealt.physical"),
      value: warrior.meleeDamage,
      color: "text-blue-300",
    },
    {
      type: t("battleUi.breakdowns.damageDealt.auxiliary"),
      value: warrior.auxiliaryDamage,
      color: "text-orange-300",
    },
    {
      type: t("battleUi.breakdowns.damageDealt.fire"),
      value: warrior.fireDamage,
      color: "text-red-400",
    },
    {
      type: t("battleUi.breakdowns.damageDealt.cold"),
      value: warrior.frostDamage,
      color: "text-cyan-400",
    },
    {
      type: t("battleUi.breakdowns.damageDealt.lightning"),
      value: warrior.lightningDamage,
      color: "text-yellow-400",
    },
    {
      type: t("battleUi.breakdowns.damageDealt.thirdAttack"),
      value: warrior.thirdAttDamage,
      color: "text-orange-400",
    },
    {
      type: t("battleUi.breakdowns.damageDealt.rage"),
      value: warrior.rageDamageDealt,
      color: "text-red-300",
    },
    {
      type: t("battleUi.breakdowns.damageDealt.percent"),
      value: warrior.trueDamageDealt,
      color: "text-white",
    },
    {
      type: t("battleUi.breakdowns.damageDealt.stigma"),
      value: warrior.stigmaDamageDealt,
      color: "text-purple-400",
    },
    {
      type: t("battleUi.breakdowns.damageDealt.reflected"),
      value: warrior.reflectedDamage,
      color: "text-purple-400",
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
      <BreakdownTable
        items={damageStats}
        typeHeader={t("battleUi.breakdowns.headers.damageType")}
        valueHeader={t("battleUi.breakdowns.headers.value")}
      />
    </div>
  );
};
