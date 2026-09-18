import { SectionCard as Card } from "@/components/common/section-card/section-card";
import { ExpandableDataTable } from "./expandable-data-table";
import {
  getBattleStatsTableColumns,
  type BattleStatsExpansionType,
} from "./battle-stats-table-columns-full";
import { OneVsOneStatsTable } from "./one-vs-one-stats-table";
import { BattleStatsTableHeader } from "./battle-stats-table-header";
import { useState, type ReactNode } from "react";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { cn } from "cn";
import { useTranslation } from "react-i18next";
import type { StatsCustomizationConfig } from "@/types/stats-customization.types";
import type { Battle } from "@/lib/api/battlelog-types";
import { BATTLE_SURFACE_COLORS } from "./utils/battle-color-palette";

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
  /** Only the duel table supports it: the group table needs its own horizontal scroller. */
  pinnedHeader?: boolean;
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
  pinnedHeader,
  statsCustomizationConfig,
}: BattleStatsTableProps) {
  const { t } = useTranslation();

  const [expandedRows, setExpandedRows] = useState<
    Map<string, BattleStatsExpansionType>
  >(new Map());

  const userTeam = battle.warriors.find(
    (w) => w.originalId === battle.characterId,
  )?.team;

  const toggleExpansion = (
    warriorId: string,
    expansionType: BattleStatsExpansionType,
  ) => {
    setExpandedRows((prev) => {
      const newMap = new Map(prev);

      if (newMap.get(warriorId) === expansionType) {
        newMap.delete(warriorId);
      } else {
        newMap.set(warriorId, expansionType);
      }

      return newMap;
    });
  };

  const sortedWarriors = [...battle.warriors].sort((a, b) => {
    if (a.team === userTeam && b.team !== userTeam) return -1;

    if (a.team !== userTeam && b.team === userTeam) return 1;

    return a.team - b.team;
  });

  const currentColumns = getBattleStatsTableColumns({
    characterId: battle.characterId,
    expandedRows,
    onToggleExpansion: toggleExpansion,
    rankingMaxima: {
      damageDealt: Math.max(...battle.warriors.map((w) => w.damageDealt)),
      damageTaken: Math.max(...battle.warriors.map((w) => w.damageTaken)),
    },
    t,
    userTeam,
  });

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
        pinnedHeader={pinnedHeader}
        statsCustomizationConfig={statsCustomizationConfig}
      />
    );
  }

  return (
    <Card
      className={cn(
        // `isolate` keeps the sticky cells' z-indexes from competing with the pinned chart.
        "isolate border-border bg-card overflow-hidden gap-0 p-0 w-full",
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
          "min-h-0 w-full max-w-screen",
          className,
          scrollClassName,
        )}
      >
        <ExpandableDataTable
          columns={currentColumns}
          data={sortedWarriors}
          expandedRows={expandedRows}
          getTeamClassName={(warrior) =>
            warrior.team === userTeam
              ? BATTLE_SURFACE_COLORS.team.friendlyStripe
              : BATTLE_SURFACE_COLORS.team.enemyStripe
          }
        />
      </ScrollArea>
    </Card>
  );
}
