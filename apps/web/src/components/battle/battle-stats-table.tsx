import { Card } from "@lootlog/ui/components/card";
import { ExpandableDataTable } from "./expandable-data-table";
import { getBattleStatsTableColumns } from "./battle-stats-table-columns-full";
import { OneVsOneStatsTable } from "./one-vs-one-stats-table";
import { ChartArea } from "lucide-react";
import { useMemo, useState } from "react";
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
  const [expandedRows, setExpandedRows] = useState<
    Map<
      string,
      "damage" | "legendary" | "turns" | "blocks" | "details" | "damageDealt"
    >
  >(new Map());

  const userTeam = useMemo(() => {
    return battle.warriors.find((w) => w.originalId === battle.characterId)
      ?.team;
  }, [battle.warriors, battle.characterId]);

  const createToggleExpansion =
    (
      key:
        | "damage"
        | "legendary"
        | "turns"
        | "blocks"
        | "details"
        | "damageDealt",
    ) =>
    (warriorId: string) => {
      setExpandedRows((prev) => {
        const newMap = new Map(prev);
        if (newMap.get(warriorId) === key) {
          newMap.delete(warriorId);
        } else {
          newMap.set(warriorId, key);
        }
        return newMap;
      });
    };

  const toggleDamageExpansion = createToggleExpansion("damage");
  const toggleLegendaryExpansion = createToggleExpansion("legendary");
  const toggleTurnsExpansion = createToggleExpansion("turns");
  const toggleBlocksExpansion = createToggleExpansion("blocks");
  const toggleDetailsExpansion = createToggleExpansion("details");
  const toggleDamageDealtExpansion = createToggleExpansion("damageDealt");

  const sortedWarriors = useMemo(() => {
    return [...battle.warriors].sort((a, b) => {
      if (a.team === userTeam && b.team !== userTeam) return -1;
      if (a.team !== userTeam && b.team === userTeam) return 1;
      return a.team - b.team;
    });
  }, [battle.warriors, userTeam]);

  const currentColumns = useMemo(() => {
    return getBattleStatsTableColumns(
      battle,
      expandedRows,
      toggleDamageExpansion,
      toggleLegendaryExpansion,
      toggleTurnsExpansion,
      toggleBlocksExpansion,
      toggleDetailsExpansion,
      toggleDamageDealtExpansion,
    );
  }, [battle, expandedRows]);

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
