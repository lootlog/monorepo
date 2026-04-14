import type { Warrior } from "@/hooks/api/battle-log/use-battles";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { BreakdownTable } from "./breakdown-table";

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
          <BreakdownTable
            items={turnsBreakdown}
            typeHeader={t("battleUi.breakdowns.headers.actionType")}
            valueHeader={t("battleUi.breakdowns.headers.value")}
          />
        </div>

        {spellBreakdown.length > 0 && (
          <div>
            <BreakdownTable
              items={spellBreakdown.map((item) => ({
                type: item.spell,
                value: item.count,
                color: "text-purple-300",
              }))}
              typeHeader={t("battleUi.breakdowns.headers.skill")}
              valueHeader={t("battleUi.breakdowns.headers.uses")}
            />
          </div>
        )}
      </div>
    </div>
  );
};
