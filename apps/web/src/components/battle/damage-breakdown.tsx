import type { BattleWarrior as Warrior } from "@/lib/api/battlelog-types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@lootlog/ui/components/table";
import type { FC } from "react";
import { useTranslation } from "react-i18next";

interface DamageBreakdownProps {
  warrior: Warrior;
}

export const DamageBreakdown: FC<DamageBreakdownProps> = ({ warrior }) => {
  const { t } = useTranslation();
  const damageBreakdown = [
    {
      type: t("battleUi.breakdowns.damageTaken.all"),
      value: warrior.damageTaken,
      color: "text-white",
    },
    {
      type: t("battleUi.breakdowns.damageTaken.ranged"),
      value: warrior.distanceDamageTaken,
      color: "text-green-400",
    },
    {
      type: t("battleUi.breakdowns.damageTaken.physical"),
      value: warrior.meleeDamageTaken,
      color: "text-blue-300",
    },
    {
      type: t("battleUi.breakdowns.damageTaken.auxiliary"),
      value: warrior.auxiliaryDamageTaken,
      color: "text-orange-300",
    },
    {
      type: t("battleUi.breakdowns.damageTaken.fire"),
      value: warrior.fireDamageTaken,
      color: "text-red-400",
    },
    {
      type: t("battleUi.breakdowns.damageTaken.ice"),
      value: warrior.frostDamageTaken,
      color: "text-cyan-400",
    },
    {
      type: t("battleUi.breakdowns.damageTaken.lightning"),
      value: warrior.lightningDamageTaken,
      color: "text-yellow-400",
    },
    {
      type: t("battleUi.breakdowns.damageTaken.thirdAttack"),
      value: warrior.thirdAttDamageTaken,
      color: "text-orange-400",
    },
    {
      type: t("battleUi.breakdowns.damageTaken.percent"),
      value: warrior.trueDamageTaken,
      color: "text-white",
    },
    {
      type: t("battleUi.breakdowns.damageTaken.stigma"),
      value: warrior.stigmaDamageTaken,
      color: "text-purple-400",
    },
    {
      type: t("battleUi.breakdowns.damageTaken.wound"),
      value: warrior.woundDamageTaken,
      color: "text-orange-600",
    },
    {
      type: t("battleUi.breakdowns.damageTaken.poison"),
      value: warrior.poisonDamageTaken,
      color: "text-green-600",
    },
    {
      type: t("battleUi.breakdowns.damageTaken.injure"),
      value: warrior.injureDamageTaken,
      color: "text-red-300",
    },
    {
      type: t("battleUi.breakdowns.damageTaken.criticalWound"),
      value: warrior.critWoundDamageTaken,
      color: "text-orange-400",
    },
    {
      type: t("battleUi.breakdowns.damageTaken.firePassive"),
      value: warrior.firePassiveDamageTaken,
      color: "text-red-500",
    },
    {
      type: t("battleUi.breakdowns.damageTaken.lightningPassive"),
      value: warrior.lightningPassiveDamageTaken,
      color: "text-yellow-500",
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
      <Table className="text-sm">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="h-8 text-xs">
              {t("battleUi.breakdowns.headers.damageType")}
            </TableHead>
            <TableHead className="h-8 text-xs text-right">
              {t("battleUi.breakdowns.headers.value")}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {damageBreakdown.map((item, index) => (
            <TableRow key={index} className="h-8 hover:bg-transparent">
              <TableCell className={`py-1 ${item.color}`}>
                {item.type}
              </TableCell>
              <TableCell className="py-1 text-right font-medium tabular-nums">
                {item.value}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
