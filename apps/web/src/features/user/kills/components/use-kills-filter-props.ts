import { LIFETIME_KILL_STATS_PARAMS } from "@/features/kills/lifetime-kill-stats-params";
import { TRACKABLE_NPC_TYPES } from "@lootlog/domain/npc-type";
import { findKilledNpcType, type KilledNpcType } from "@/constants/npc";
import { useKillsControllerGetUserKillStats } from "@lootlog/client/main";
import type { KillStatsFiltersProps } from "@/features/kills/components/kill-stats-filters";
import type { KillStatsPeriod } from "@/features/kills/kill-stats-period";

export type KillsFiltersState = {
  world?: string;
  npcTypes?: KilledNpcType[];
  search?: string;
  minLvl?: number;
  maxLvl?: number;
  period: KillStatsPeriod;
};

type UseKillsFilterPropsOptions = {
  filters: Pick<KillsFiltersState, "world" | "npcTypes" | "period">;
  minLvl: string;
  maxLvl: string;
  onWorldChange: (world: string | undefined) => void;
  onNpcTypeChange: (npcTypes: KilledNpcType[] | undefined) => void;
  onMinLvlChange: (minLvl: string) => void;
  onMaxLvlChange: (maxLvl: string) => void;
  onPeriodChange: (period: KillStatsPeriod) => void;
};

export const useKillsFilterProps = ({
  filters,
  minLvl,
  maxLvl,
  onWorldChange,
  onNpcTypeChange,
  onMinLvlChange,
  onMaxLvlChange,
  onPeriodChange,
}: UseKillsFilterPropsOptions): KillStatsFiltersProps => {
  const { data } = useKillsControllerGetUserKillStats(
    LIFETIME_KILL_STATS_PARAMS,
    {
      query: {
        staleTime: 30_000,
      },
    },
  );

  const worlds = data?.overview.killsByWorld
    ? Object.keys(data.overview.killsByWorld).sort()
    : [];

  const handleNpcTypeChange = (value: string | null) => {
    const npcType = value ? findKilledNpcType(value) : undefined;

    onNpcTypeChange(npcType ? [npcType] : undefined);
  };

  return {
    world: {
      value: filters.world ?? null,
      worlds,
      onChange: (world) => onWorldChange(world ?? undefined),
    },
    period: filters.period,
    onPeriodChange,
    npcType: {
      types: TRACKABLE_NPC_TYPES,
      value: filters.npcTypes?.[0],
      onValueChange: handleNpcTypeChange,
    },
    level: { minLvl, maxLvl, onMinLvlChange, onMaxLvlChange },
  };
};
