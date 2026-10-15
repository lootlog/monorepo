import {
  findTrackableNpcType,
  TRACKABLE_NPC_TYPES,
  type NpcType,
} from "@/features/user/kills/npc-types";
import {
  getKillsControllerGetUserKillStatsQueryKey,
  useKillsControllerGetUserKillStats,
} from "@lootlog/client/main";
import type { KillStatsFiltersProps } from "@/features/kills/components/kill-stats-filters";
import type { KillStatsPeriod } from "@/features/kills/components/kill-stats-period-select";

export type KillsFiltersState = {
  world?: string;
  npcTypes?: NpcType[];
  search?: string;
  minLvl?: number;
  maxLvl?: number;
  period: KillStatsPeriod;
};

type UseKillsFilterPropsOptions = {
  filters: Pick<KillsFiltersState, "world" | "npcTypes" | "period">;
  /** Level bounds as the URL keeps them ("" when unset). */
  minLvl: string;
  maxLvl: string;
  onWorldChange: (world: string | undefined) => void;
  onNpcTypeChange: (npcTypes: NpcType[] | undefined) => void;
  onMinLvlChange: (minLvl: string) => void;
  onMaxLvlChange: (maxLvl: string) => void;
  onPeriodChange: (period: KillStatsPeriod) => void;
};

/** The personal kills page's filters, over the worlds the User has kills on. */
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
  const { data } = useKillsControllerGetUserKillStats(undefined, {
    query: {
      queryKey: getKillsControllerGetUserKillStatsQueryKey(),
      staleTime: 30_000,
    },
  });

  const worlds = data?.overview.killsByWorld
    ? Object.keys(data.overview.killsByWorld).sort()
    : [];

  const handleNpcTypeChange = (value: string | null) => {
    const npcType = value ? findTrackableNpcType(value) : undefined;

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
