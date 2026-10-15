import { WorldSwitcher } from "@/components/common/world-switcher";
import {
  KillStatsLevelRange,
  type KillStatsLevelRangeValue,
} from "@/features/kills/components/kill-stats-level-range";
import {
  KillStatsPeriodSelect,
  type KillStatsPeriod,
} from "@/features/kills/components/kill-stats-period-select";
import { KillStatsNpcTypeSelect } from "@/features/kills/components/kill-stats-npc-type-select";

export type KillStatsFiltersProps = {
  /** Omit where the world is the Organization's context instead of a filter. */
  world?: {
    value: string | null;
    /** Worlds to offer; omit to list the current guild's worlds. */
    worlds?: string[];
    onChange: (value: string | null) => void;
  };
  period: KillStatsPeriod | undefined;
  onPeriodChange: (value: KillStatsPeriod) => void;
  level?: KillStatsLevelRangeValue;
  npcType?: {
    types: readonly string[];
    value: string | null | undefined;
    onValueChange: (value: string | null) => void;
  };
};

/** The kill statistics filters for a filter bar, after its search. */
export const KillStatsFilters = ({
  world,
  period = "all",
  onPeriodChange,
  level,
  npcType,
}: KillStatsFiltersProps) => (
  <>
    {world && (
      <WorldSwitcher
        value={world.value}
        onValueChange={world.onChange}
        worlds={world.worlds}
        showAllOption
      />
    )}
    <KillStatsPeriodSelect
      value={period}
      onValueChange={onPeriodChange}
      className="w-[200px]"
    />
    {npcType && <KillStatsNpcTypeSelect {...npcType} />}
    {level && <KillStatsLevelRange level={level} layout="inline" />}
  </>
);
