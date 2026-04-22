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

interface TurnsBreakdownProps {
  warrior: Warrior;
}

export const TurnsBreakdown: FC<TurnsBreakdownProps> = ({ warrior }) => {
  const { t } = useTranslation();
  const turnsBreakdown = [
    {
      type: t("battleUi.breakdowns.turns.totalTurns"),
      value: warrior.turns,
      color: "text-blue-400",
    },
    {
      type: t("battleUi.breakdowns.turns.normalAttacks"),
      value: warrior.normalAttacks,
      color: "text-orange-400",
    },
    {
      type: t("battleUi.breakdowns.turns.spellsUsed"),
      value: warrior.spellsUsed,
      color: "text-purple-400",
    },
    {
      type: t("battleUi.breakdowns.turns.steps"),
      value: warrior.steps,
      color: "text-green-400",
    },
    {
      type: t("battleUi.breakdowns.turns.turnsLost"),
      value: warrior.turnsLost,
      color: "text-red-400",
    },
  ].filter((item) => item.value > 0);

  // Detailed spell breakdown
  const spellBreakdown = Object.entries(warrior.spellsUsedMap || {})
    .map(([spell, count]) => ({
      spell,
      count,
    }))
    .sort((a, b) => b.count - a.count);

  if (turnsBreakdown.length === 0 && spellBreakdown.length === 0) {
    return (
      <div className="p-4 text-sm text-muted-foreground bg-background hover:bg-background">
        {t("battleUi.breakdowns.turns.empty")}
      </div>
    );
  }

  return (
    <div className="p-4 bg-background hover:bg-background">
      <h4 className="font-semibold mb-3 text-sm">
        {t("battleUi.breakdowns.turns.title", { name: warrior.name })}
      </h4>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <Table className="text-sm">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-8 text-xs">
                  {t("battleUi.breakdowns.headers.actionType")}
                </TableHead>
                <TableHead className="h-8 text-xs text-right">
                  {t("battleUi.breakdowns.headers.value")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {turnsBreakdown.map((item, index) => (
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

        {spellBreakdown.length > 0 && (
          <div>
            <Table className="text-sm">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="h-8 text-xs">
                    {t("battleUi.breakdowns.headers.skill")}
                  </TableHead>
                  <TableHead className="h-8 text-xs text-right">
                    {t("battleUi.breakdowns.headers.uses")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {spellBreakdown.map((item, index) => (
                  <TableRow key={index} className="h-8 hover:bg-transparent">
                    <TableCell className="py-1 text-purple-300">
                      {item.spell}
                    </TableCell>
                    <TableCell className="py-1 text-right font-medium tabular-nums">
                      {item.count}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
};
