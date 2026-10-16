import { WorldSwitcher } from "@/components/common/world-switcher";
import { KillStatsNpcTypeSelect } from "@/features/kills/components/kill-stats-npc-type-select";
import { TRACKABLE_NPC_TYPES } from "@/features/user/kills/npc-types";
import { StatisticsPeriodSelect } from "./statistics-period-select";
import type { StatisticsDays, StatisticsNpcType } from "./statistics-search";

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
};

export const countActiveStatisticsFilters = ({
  world,
  days,
  npcType,
}: StatisticsFiltersProps) =>
  [Boolean(world), days !== 30, Boolean(npcType?.value)].filter(Boolean).length;

export const toNpcType = (value: string | null) =>
  TRACKABLE_NPC_TYPES.find((type) => type === value);

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
