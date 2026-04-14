import { Card } from "@lootlog/ui/components/card";
import { ExpandableDataTable } from "./expandable-data-table";
import {
  type ExpansionType,
  getBattleStatsTableColumns,
} from "./battle-stats-table-columns-full";
import { OneVsOneStatsTable } from "./one-vs-one-stats-table";
import { ChartArea } from "lucide-react";
import { useState } from "react";
import { ScrollArea, ScrollBar } from "@lootlog/ui/components/scroll-area";
import { cn } from "@lootlog/ui/lib/utils";
import type { Battle, Warrior } from "@/hooks/api/battle-log/use-battles";

interface BattleStatsTableProps {
  battle: Battle;
  className?: string;
  showHeader?: boolean;
  hideZeros?: boolean;
  onHideZerosChange?: (value: boolean) => void;
}

export function BattleStatsTable({
  battle,
  className,
  showHeader = true,
  hideZeros,
  onHideZerosChange,
}: BattleStatsTableProps) {
  const [expandedRows, setExpandedRows] = useState<Map<string, ExpansionType>>(
    new Map(),
  );

  const userTeam = battle.warriors.find(
    (w) => w.originalId === battle.characterId,
  )?.team;

  const toggleExpansion = (warriorId: string, type: ExpansionType) => {
    setExpandedRows((prev) => {
      const newMap = new Map(prev);
      if (newMap.get(warriorId) === type) {
        newMap.delete(warriorId);
      } else {
        newMap.set(warriorId, type);
      }
      return newMap;
    });
  };

  const sortedWarriors = [...battle.warriors].sort((a, b) => {
    if (a.team === userTeam && b.team !== userTeam) return -1;
    if (a.team !== userTeam && b.team === userTeam) return 1;
    return a.team - b.team;
  });

  const currentColumns = getBattleStatsTableColumns(
    battle,
    expandedRows,
    toggleExpansion,
  );

  if (battle.type === "1v1") {
    return (
      <OneVsOneStatsTable
        battle={battle}
        showHeader={showHeader}
        hideZeros={hideZeros}
        onHideZerosChange={onHideZerosChange}
      />
    );
  }

  return (
    <Card className="border-border bg-card/40 backdrop-blur-sm overflow-hidden gap-0 p-0 w-full">
      {showHeader && (
        <div className="sticky top-0 z-9 bg-background border-b">
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-semibold">
                <ChartArea className="h-5 w-5" />
                Statystyki walki
              </div>
            </div>
          </div>
        </div>
      )}
      <ScrollArea
        className={cn(
          "max-w-[100dvw] sm:max-w-[calc(100dvw-20rem)]",
          className,
        )}
      >
        <ExpandableDataTable
          columns={currentColumns}
          data={sortedWarriors}
          expandedRows={expandedRows}
          getRowClassName={(row) => {
            const warrior = row.original as Warrior;

            return cn({
              "bg-green-400/10 hover:bg-green-400/20":
                warrior.team === userTeam,
              "bg-red-400/10 hover:bg-red-400/20": warrior.team !== userTeam,
              "bg-green-400/20 hover:bg-green-400/30":
                warrior.originalId === battle.characterId,
            });
          }}
        />
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </Card>
  );
}
