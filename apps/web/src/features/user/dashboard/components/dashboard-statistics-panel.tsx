import {
  getKillsControllerGetUserKillStatsQueryKey,
  useKillsControllerGetUserKillStats,
} from "@lootlog/api-client/react-query/main/kills";
import { useNavigate } from "@tanstack/react-router";
import { useDashboardFilters } from "../hooks/use-dashboard-filters";
import { DashboardStatisticsPanelView } from "./dashboard-statistics-panel-view";

export const DashboardStatisticsPanel = () => {
  const navigate = useNavigate();
  const { filters, updateFilters } = useDashboardFilters();
  const overviewParams = {
    world: filters.world,
    period: filters.period === "all" ? undefined : filters.period,
  };
  const rankingParams = {
    ...overviewParams,
    npcTypes: [filters.npcType],
  };
  const overviewQuery = useKillsControllerGetUserKillStats(overviewParams, {
    query: {
      queryKey: getKillsControllerGetUserKillStatsQueryKey(overviewParams),
      staleTime: 30_000,
    },
  });
  const rankingQuery = useKillsControllerGetUserKillStats(rankingParams, {
    query: {
      queryKey: getKillsControllerGetUserKillStatsQueryKey(rankingParams),
      staleTime: 30_000,
    },
  });
  const worldsQuery = useKillsControllerGetUserKillStats(undefined, {
    query: {
      queryKey: getKillsControllerGetUserKillStatsQueryKey(),
      staleTime: 30_000,
    },
  });
  const availableWorlds = Object.keys(
    worldsQuery.data?.overview.killsByWorld ?? {},
  );

  return (
    <DashboardStatisticsPanelView
      availableWorlds={availableWorlds}
      filters={filters}
      overview={{
        data: overviewQuery.data,
        isError: overviewQuery.isError,
        isLoading: overviewQuery.isLoading,
        onRetry: () => void overviewQuery.refetch(),
      }}
      ranking={{
        data: rankingQuery.data,
        isError: rankingQuery.isError,
        isLoading: rankingQuery.isLoading,
        onRetry: () => void rankingQuery.refetch(),
      }}
      onWorldChange={(world) => updateFilters({ world })}
      onPeriodChange={(period) => updateFilters({ period })}
      onNpcTypeChange={(npcType) => updateFilters({ npcType })}
      onViewAll={() => void navigate({ to: "/@me/kills" })}
    />
  );
};
