import {
  getKillsControllerGetUserKillStatsQueryKey,
  useKillsControllerGetUserKillStats,
} from "@lootlog/api-client/react-query/main/kills";
import { Card } from "@lootlog/ui/components/card";
import { Swords } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useDashboardFilters } from "../hooks/use-dashboard-filters";
import { DashboardStatisticsFilters } from "./dashboard-statistics-filters";
import { PlayerKillStatsPanel } from "./player-kill-stats-panel";
import { TopKilledNpcsPanel } from "./top-killed-npcs-panel";

export const DashboardStatisticsPanel: React.FC = () => {
  const { t } = useTranslation();
  const { filters, updateFilters } = useDashboardFilters();
  const overviewParams = {
    world: filters.world,
    period: filters.period === "all" ? undefined : filters.period,
  };
  const overviewQuery = useKillsControllerGetUserKillStats(overviewParams, {
    query: {
      queryKey: getKillsControllerGetUserKillStatsQueryKey(overviewParams),
      staleTime: 30_000,
    },
  });
  const hasActiveFilters = Boolean(filters.world) || filters.period !== "all";

  return (
    <section
      aria-labelledby="dashboard-statistics-title"
      className="@container/statistics flex min-w-0 flex-col gap-3"
    >
      <header className="flex min-h-12 flex-col gap-2 border-b border-border/70 pb-3 @2xl/statistics:flex-row @2xl/statistics:items-center @2xl/statistics:justify-between">
        <h2
          id="dashboard-statistics-title"
          className="flex min-w-0 items-center gap-2 text-sm font-semibold"
        >
          <Swords className="size-4 shrink-0 text-primary" />
          <span className="truncate">{t("kills.playerStats.title")}</span>
        </h2>

        <DashboardStatisticsFilters
          filters={filters}
          onWorldChange={(world) => updateFilters({ world })}
          onPeriodChange={(period) => updateFilters({ period })}
        />
      </header>

      <div className="flex min-w-0 flex-col gap-3">
        <Card data-statistics-card="summary" className="min-w-0 gap-0 py-0">
          <PlayerKillStatsPanel
            data={overviewQuery.data}
            hasActiveFilters={hasActiveFilters}
            isError={overviewQuery.isError}
            isLoading={overviewQuery.isLoading}
            onRetry={() => void overviewQuery.refetch()}
          />
        </Card>

        <Card data-statistics-card="monsters" className="min-w-0 gap-0 py-0">
          <TopKilledNpcsPanel
            world={filters.world}
            npcType={filters.npcType}
            period={filters.period}
            onNpcTypeChange={(npcType) => updateFilters({ npcType })}
          />
        </Card>
      </div>
    </section>
  );
};
