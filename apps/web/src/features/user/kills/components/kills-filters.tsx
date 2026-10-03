import { useTranslation } from "react-i18next";
import {
  findTrackableNpcType,
  TRACKABLE_NPC_TYPES,
  type NpcType,
} from "@/features/user/kills/npc-types";
import {
  getKillsControllerGetUserKillStatsQueryKey,
  useKillsControllerGetUserKillStats,
} from "@lootlog/client/main";
import type { KillStatsPeriod } from "@/features/kills/components/kill-stats-period-select";
import { KillStatsFilterBar } from "@/features/kills/components/kill-stats-filter-bar";

export type KillsFiltersState = {
  world?: string;
  npcTypes?: NpcType[];
  search?: string;
  minLvl?: number;
  maxLvl?: number;
  period: KillStatsPeriod;
};

type KillsFiltersProps = {
  filters: Omit<KillsFiltersState, "minLvl" | "maxLvl">;
  /** Level bounds as the URL keeps them ("" when unset). */
  minLvl: string;
  maxLvl: string;
  onWorldChange: (world: string | undefined) => void;
  onNpcTypeChange: (npcTypes: NpcType[] | undefined) => void;
  onSearchChange: (search: string) => void;
  onMinLvlChange: (minLvl: string) => void;
  onMaxLvlChange: (maxLvl: string) => void;
  onPeriodChange: (period: KillStatsPeriod) => void;
};

export const KillsFilters: React.FC<KillsFiltersProps> = ({
  filters,
  minLvl,
  maxLvl,
  onWorldChange,
  onNpcTypeChange,
  onSearchChange,
  onMinLvlChange,
  onMaxLvlChange,
  onPeriodChange,
}) => {
  const { t } = useTranslation();

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

  return (
    <KillStatsFilterBar
      world={filters.world ?? null}
      worlds={worlds}
      period={filters.period}
      onWorldChange={(world) => onWorldChange(world ?? undefined)}
      onPeriodChange={onPeriodChange}
      search={{
        value: filters.search ?? "",
        placeholder: t("kills.ranking.search"),
        onChange: onSearchChange,
      }}
      npcType={{
        types: TRACKABLE_NPC_TYPES,
        value: filters.npcTypes?.[0],
        onValueChange: handleNpcTypeChange,
      }}
      level={{ minLvl, maxLvl, onMinLvlChange, onMaxLvlChange }}
    />
  );
};
