import { WorldSwitcher } from "@/components/common/world-switcher";
import {
  KillStatsLevelRange,
  type KillStatsLevelRangeValue,
} from "@/features/kills/components/kill-stats-level-range";
import { KillStatsPeriodSelect } from "@/features/kills/components/kill-stats-period-select";
import type { KillStatsPeriod } from "@/features/kills/kill-stats-period";
import { KillStatsNpcTypeSelect } from "@/features/kills/components/kill-stats-npc-type-select";

export type KillStatsFiltersProps = {
  world?: {
    value: string | null;
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
    {level && <KillStatsLevelRange level={level} />}
  </>
);
