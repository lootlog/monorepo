import { WorldSwitcher } from "@/components/common/world-switcher";
import { KillStatsNpcTypeSelect } from "@/features/kills/components/kill-stats-npc-type-select";
import { TRACKABLE_NPC_TYPES } from "@/features/user/kills/npc-types";
import { StatisticsPeriodSelect } from "./statistics-period-select";
import {
  toNpcType,
  type StatisticsDays,
  type StatisticsNpcType,
  type StatisticsSort,
  type StatisticsSortTab,
} from "./statistics-search";
import type { StatisticsSortValue } from "./statistics-sort";

export type StatisticsFiltersProps = {
  world: string | undefined;
  worlds: string[];
  onWorldChange: (world: string | undefined) => void;
  days: StatisticsDays;
  onDaysChange: (days: StatisticsDays) => void;
  /** Only the monster ranking narrows to one type. */
  npcType?: {
    value: StatisticsNpcType | undefined;
    onChange: (type: StatisticsNpcType | undefined) => void;
  };
  /** A ranking tab's sort; wide pages sort from the table headers instead. */
  sort?: {
    tab: StatisticsSortTab;
    fields: readonly StatisticsSort[];
    value: StatisticsSortValue;
    onChange: (sort: StatisticsSortValue) => void;
  };
};

/** The statistics filters for the filter bar. */
export function StatisticsFilters({
  world,
  worlds,
  onWorldChange,
  days,
  onDaysChange,
  npcType,
}: StatisticsFiltersProps) {
  return (
    <>
      <WorldSwitcher
        value={world ?? null}
        onValueChange={(next) => onWorldChange(next ?? undefined)}
        worlds={worlds}
        showAllOption
      />
      <StatisticsPeriodSelect value={days} onValueChange={onDaysChange} />
      {npcType && (
        <KillStatsNpcTypeSelect
          types={TRACKABLE_NPC_TYPES}
          value={npcType.value}
          onValueChange={(type) => npcType.onChange(toNpcType(type))}
        />
      )}
    </>
  );
}
