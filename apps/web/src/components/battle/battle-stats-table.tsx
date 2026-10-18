import { ExpandableDataTable } from "./expandable-data-table";
import {
  getBattleStatsTableColumns,
  type BattleStatsExpansionType,
} from "./battle-stats-table-columns-full";
import { OneVsOneStatsTable } from "./one-vs-one-stats-table";
import { BattleStatsTableHeader } from "./battle-stats-table-header";
import { useId, useState, type ReactNode } from "react";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { cn } from "cn";
import { useTranslation } from "react-i18next";
import type { StatsCustomizationConfig } from "@/types/stats-customization.types";
import type { Battle } from "@/lib/api/battlelog-types";

interface BattleStatsTableProps {
  battle: Battle;
  className?: string;
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
  const headingId = useId();

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
    <section
      aria-labelledby={showHeader ? headingId : undefined}
      // `isolate` keeps the sticky cells' z-indexes from competing with the pinned chart.
      className="isolate w-full"
    >
      {showHeader && (
        <BattleStatsTableHeader
          id={headingId}
          title={headerTitle ?? t("battlePanel.single.statistics.title")}
          actions={headerActions}
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
        />
      </ScrollArea>
    </section>
  );
}
