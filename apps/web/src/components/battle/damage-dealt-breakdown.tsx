import type { Warrior } from "@/hooks/api/battle-log/use-battles";
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
          {damageStats.map((item, index) => (
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
