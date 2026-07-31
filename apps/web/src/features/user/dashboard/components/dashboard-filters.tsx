import type { DashboardFilters } from "../hooks/use-dashboard-filters";
import {
  getKillsControllerGetUserKillStatsQueryKey,
  useKillsControllerGetUserKillStats,
} from "@lootlog/api-client/react-query/main/kills";
import {
  KillStatsPeriodSelect,
  type KillStatsPeriod,
} from "@/features/kills/components/kill-stats-period-select";
import { WorldSwitcher } from "@/components/common/world-switcher";

type DashboardFiltersProps = {
  filters: DashboardFilters;
  onWorldChange: (world: string | undefined) => void;
  onPeriodChange: (period: KillStatsPeriod) => void;
};

export const DashboardFiltersBar: React.FC<DashboardFiltersProps> = ({
  filters,
  onWorldChange,
  onPeriodChange,
}) => {
  const { data } = useKillsControllerGetUserKillStats(undefined, {
    query: {
      queryKey: getKillsControllerGetUserKillStatsQueryKey(),
      staleTime: 30_000,
    },
  });

  const worlds = data?.overview.killsByWorld
    ? Object.keys(data.overview.killsByWorld).sort()
    : [];

  const handleWorldChange = (value: string | null) => {
    onWorldChange(value ?? undefined);
  };

  return (
    <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:items-center sm:justify-end">
      <KillStatsPeriodSelect
        value={filters.period}
        onValueChange={onPeriodChange}
        className="w-full sm:w-[160px]"
      />
      <WorldSwitcher
        value={filters.world ?? null}
        onValueChange={handleWorldChange}
        showAllOption
        worlds={worlds}
        width="w-full sm:w-[180px]"
        triggerClassName="w-full"
      />
    </div>
  );
};
