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

interface WarriorDetailsBreakdownProps {
  warrior: Warrior;
}

export const WarriorDetailsBreakdown: FC<WarriorDetailsBreakdownProps> = ({
  warrior,
}) => {
  const { t } = useTranslation();
  const healingStats = [
    {
      type: t("battleUi.breakdowns.details.passiveHealing"),
      value: warrior.passiveHealing,
      color: "text-green-400",
    },
    {
      type: t("battleUi.breakdowns.details.activeHealing"),
      value: warrior.activeHealing,
      color: "text-green-400",
    },
  ].filter((item) => item.value > 0);

  const offensiveStats = [
    {
      type: t("battleUi.breakdowns.details.armorPierces"),
      value: warrior.armorPierces,
      color: "text-yellow-400",
    },
    {
      type: t("battleUi.breakdowns.details.fastArrows"),
      value: warrior.fastArrows,
      color: "text-yellow-400",
    },
    {
      type: t("battleUi.breakdowns.details.reducedArmor"),
      value: warrior.reducedArmor,
      color: "text-yellow-400",
    },
    {
      type: t("battleUi.breakdowns.details.destroyedResistances"),
      value: warrior.magicResistanceDestroyed,
      color: "text-yellow-400",
    },
    {
      type: t("battleUi.breakdowns.details.reducedPoisonResistance"),
      value: warrior.reducedPoisonResistance,
      color: "text-yellow-400",
    },
  ].filter((item) => item.value > 0);

  const defensiveStats = [
    {
      type: t("battleUi.breakdowns.details.counters"),
      value: warrior.counters,
      color: "text-blue-400",
    },
  ].filter((item) => item.value > 0);

  const resourceStats = [
    {
      type: t("battleUi.breakdowns.details.destroyedEnergy"),
      value: warrior.destroyedEnergy,
      color: "text-cyan-400",
    },
    {
      type: t("battleUi.breakdowns.details.destroyedMana"),
      value: warrior.destroyedMana,
      color: "text-blue-400",
    },
    {
      type: t("battleUi.breakdowns.details.regeneratedEnergy"),
      value: warrior.regeneratedEnergy,
      color: "text-cyan-400",
    },
  ].filter((item) => item.value > 0);

  const sections = [
    { title: t("battleUi.breakdowns.details.healing"), stats: healingStats },
    {
      title: t("battleUi.breakdowns.details.offensiveEffects"),
      stats: offensiveStats,
    },
    {
      title: t("battleUi.breakdowns.details.defensiveEffects"),
      stats: defensiveStats,
    },
    { title: t("battleUi.breakdowns.details.resources"), stats: resourceStats },
  ].filter((section) => section.stats.length > 0);

  if (sections.length === 0) {
    return (
      <div className="p-4 text-sm text-muted-foreground bg-background hover:bg-background">
        {t("battleUi.breakdowns.details.empty")}
      </div>
    );
  }

  return (
    <div className="p-4 bg-background hover:bg-background">
      <h4 className="font-semibold mb-3 text-sm">
        {t("battleUi.breakdowns.details.title", { name: warrior.name })}
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sections.map((section, sectionIndex) => (
          <div key={sectionIndex}>
            <h5 className="font-medium text-xs mb-2 text-muted-foreground">
              {section.title}
            </h5>
            <Table className="text-sm">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="h-8 text-xs">
                    {t("battleUi.breakdowns.headers.type")}
                  </TableHead>
                  <TableHead className="h-8 text-xs text-right">
                    {t("battleUi.breakdowns.headers.value")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {section.stats.map((item, index) => (
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
        ))}
      </div>
    </div>
  );
};
