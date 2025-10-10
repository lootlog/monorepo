import { ExpandableDataTable } from "./expandable-data-table";
import { getBattleStatsTableColumns } from "./battle-stats-table-columns-full";
import { ChartArea } from "lucide-react";
import { useMemo, useState } from "react";
import { ScrollArea, ScrollBar } from "@lootlog/ui/components/scroll-area";
import { cn } from "@lootlog/ui/lib/utils";
import { Battle, Warrior } from "@/hooks/api/battle-log/use-battles";

interface BattleStatsTableProps {
  battle: Battle;
  className?: string;
}

export function BattleStatsTable({ battle, className }: BattleStatsTableProps) {
  const [expandedRows, setExpandedRows] = useState<
    Map<string, "damage" | "legendary" | "turns" | "blocks" | "details" | "damageDealt">
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

  const toggleTurnsExpansion = (warriorId: string) => {
    setExpandedRows((prev) => {
      const newMap = new Map(prev);
      if (newMap.get(warriorId) === "turns") {
        newMap.delete(warriorId);
      } else {
        newMap.set(warriorId, "turns");
      }
      return newMap;
    });
  };

  const toggleBlocksExpansion = (warriorId: string) => {
    setExpandedRows((prev) => {
      const newMap = new Map(prev);
      if (newMap.get(warriorId) === "blocks") {
        newMap.delete(warriorId);
      } else {
        newMap.set(warriorId, "blocks");
      }
      return newMap;
    });
  };

  const toggleDetailsExpansion = (warriorId: string) => {
    setExpandedRows((prev) => {
      const newMap = new Map(prev);
      if (newMap.get(warriorId) === "details") {
        newMap.delete(warriorId);
      } else {
        newMap.set(warriorId, "details");
      }
      return newMap;
    });
  };

  const toggleDamageDealtExpansion = (warriorId: string) => {
    setExpandedRows((prev) => {
      const newMap = new Map(prev);
      if (newMap.get(warriorId) === "damageDealt") {
        newMap.delete(warriorId);
      } else {
        newMap.set(warriorId, "damageDealt");
      }
      return newMap;
    });
  };

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
      toggleDamageDealtExpansion
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
      <ScrollArea
        className={cn(
          "max-w-[100dvw] sm:max-w-[calc(100dvw-20rem)]",
          className
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
    </div>
  );
}
