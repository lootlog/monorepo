import { Card } from "@lootlog/ui/components/card";
import { ExpandableDataTable } from "./expandable-data-table";
import { getBattleStatsTableColumns } from "./battle-stats-table-columns-full";
import { OneVsOneStatsTable } from "./one-vs-one-stats-table";
import { BattleStatsTableHeader } from "./battle-stats-table-header";
import { useMemo, useState, type ReactNode } from "react";
import { ScrollArea, ScrollBar } from "@lootlog/ui/components/scroll-area";
import { cn } from "@lootlog/ui/lib/utils";
import { useTranslation } from "react-i18next";
import type { StatsCustomizationConfig } from "@/types/stats-customization.types";
import type {
  Battle,
  BattleWarrior as Warrior,
} from "@/lib/api/battlelog-types";

interface BattleStatsTableProps {
  battle: Battle;
  className?: string;
  cardClassName?: string;
  compact?: boolean;
  scrollClassName?: string;
  showHeader?: boolean;
  headerTitle?: string;
  headerActions?: ReactNode;
  hideZeros?: boolean;
  onHideZerosChange?: (value: boolean) => void;
  statsCustomizationConfig?: StatsCustomizationConfig;
}

export function BattleStatsTable({
  battle,
  className,
  cardClassName,
  compact,
  scrollClassName,
  showHeader = true,
  headerTitle,
  headerActions,
  hideZeros,
  onHideZerosChange,
  statsCustomizationConfig,
}: BattleStatsTableProps) {
  const { t } = useTranslation();
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
      toggleDamageDealtExpansion,
    );
  }, [battle, expandedRows]);

  if (battle.type === "1v1") {
    return (
      <OneVsOneStatsTable
        battle={battle}
        cardClassName={cardClassName}
        compact={compact}
        scrollClassName={scrollClassName}
        showHeader={showHeader}
        headerTitle={headerTitle}
        headerActions={headerActions}
        hideZeros={hideZeros}
        onHideZerosChange={onHideZerosChange}
        statsCustomizationConfig={statsCustomizationConfig}
      />
    );
  }

  return (
    <Card
      className={cn(
        "border-border bg-card/40 backdrop-blur-sm overflow-hidden gap-0 p-0 w-full",
        cardClassName,
      )}
    >
      {showHeader && (
        <BattleStatsTableHeader
          title={headerTitle ?? t("battlePanel.single.statistics.title")}
          actions={headerActions}
          compact={compact}
        />
      )}
      <ScrollArea
        className={cn(
          "max-w-[100dvw] min-h-0 sm:max-w-[calc(100dvw-20rem)]",
          className,
          scrollClassName,
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
