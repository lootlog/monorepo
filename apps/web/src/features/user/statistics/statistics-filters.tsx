import { WorldSwitcher } from "@/components/common/world-switcher";
import { KillStatsNpcTypeSelect } from "@/features/kills/components/kill-stats-npc-type-select";
import { TRACKABLE_NPC_TYPES } from "@lootlog/domain/npc-type";
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
  npcType?: {
    value: StatisticsNpcType | undefined;
    onChange: (type: StatisticsNpcType | undefined) => void;
  };
  sort?: {
    tab: StatisticsSortTab;
    fields: readonly StatisticsSort[];
    value: StatisticsSortValue;
    onChange: (sort: StatisticsSortValue) => void;
  };
};

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
