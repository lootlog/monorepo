import { ExpandableDataTable } from "@/features/battle-panel/battle-panel-single-battle/components/battle-stats-table/expandable-data-table";
import { getColumns } from "@/features/battle-panel/battle-panel-single-battle/components/battle-stats-table/battle-stats-table-columns";
import { Battle, Warrior } from "@/hooks/api/battle-log/use-battles";
import { ChartArea } from "lucide-react";
import { useMemo, useState } from "react";
import { ScrollArea, ScrollBar } from "@lootlog/ui/components/scroll-area";
import { cn } from "@lootlog/ui/lib/utils";

interface BattleStatsTableProps {
  battle: Battle;
}

export function BattleStatsTable({ battle }: BattleStatsTableProps) {
  const [expandedRows, setExpandedRows] = useState<
    Map<string, "damage" | "legendary">
  >(new Map());

  const userTeam = useMemo(() => {
    return battle.warriors.find((w) => w.originalId === battle.characterId)
      ?.team;
  }, [battle.warriors, battle.characterId]);

  const toggleDamageExpansion = (warriorId: string) => {
    setExpandedRows((prev) => {
      const newMap = new Map(prev);
      if (newMap.get(warriorId) === "damage") {
        newMap.delete(warriorId);
      } else {
        newMap.set(warriorId, "damage");
      }
      return newMap;
    });
  };

  const toggleLegendaryExpansion = (warriorId: string) => {
    setExpandedRows((prev) => {
      const newMap = new Map(prev);
      if (newMap.get(warriorId) === "legendary") {
        newMap.delete(warriorId);
      } else {
        newMap.set(warriorId, "legendary");
      }
      return newMap;
    });
  };

  const sortedWarriors = useMemo(() => {
    return [...battle.warriors].sort((a, b) => a.team - b.team);
  }, [battle.warriors]);

  const currentColumns = useMemo(() => {
    return getColumns(
      battle,
      expandedRows,
      toggleDamageExpansion,
      toggleLegendaryExpansion
    );
  }, [battle, expandedRows]);

  return (
    <div className="w-full border-b">
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
      <ScrollArea className="max-w-[100dvw] sm:max-w-[calc(100dvw-20rem)]">
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
    </div>
  );
}
