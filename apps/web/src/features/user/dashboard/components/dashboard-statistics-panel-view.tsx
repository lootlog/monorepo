import type { UserKillStatsResponseDtoOutput } from "@lootlog/api-client/models/main/user-kill-stats-response-dto-output";
import { Card } from "@lootlog/ui/components/card";
import { Swords } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { NpcType } from "@/features/user/kills/npc-types";
import type { KillStatsPeriod } from "@/features/kills/components/kill-stats-period-select";
import type { DashboardFilters } from "../hooks/use-dashboard-filters";
import { DashboardStatisticsFilters } from "./dashboard-statistics-filters";
import { PlayerKillStatsPanel } from "./player-kill-stats-panel";
import { TopKilledNpcsPanel } from "./top-killed-npcs-panel";

export interface DashboardStatisticsQueryState {
  data?: UserKillStatsResponseDtoOutput;
  isError: boolean;
  isLoading: boolean;
  onRetry: () => void;
}

interface DashboardStatisticsPanelViewProps {
  availableWorlds: string[];
  filters: DashboardFilters;
  onNpcTypeChange: (npcType: NpcType) => void;
  onPeriodChange: (period: KillStatsPeriod) => void;
  onViewAll: () => void;
  onWorldChange: (world: string | undefined) => void;
  overview: DashboardStatisticsQueryState;
  ranking: DashboardStatisticsQueryState;
}

export const DashboardStatisticsPanelView = ({
  availableWorlds,
  filters,
  onNpcTypeChange,
  onPeriodChange,
  onViewAll,
  onWorldChange,
  overview,
  ranking,
}: DashboardStatisticsPanelViewProps) => {
  const { t } = useTranslation();
  const hasActiveFilters = Boolean(filters.world) || filters.period !== "all";

  return (
    <section
      data-slot="dashboard-statistics-panel"
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
          availableWorlds={availableWorlds}
          filters={filters}
          onWorldChange={onWorldChange}
          onPeriodChange={onPeriodChange}
        />
      </header>

      <div className="flex min-w-0 flex-col gap-3">
        <Card data-statistics-card="summary" className="min-w-0 gap-0 py-0">
          <PlayerKillStatsPanel
            data={overview.data}
            hasActiveFilters={hasActiveFilters}
            isError={overview.isError}
            isLoading={overview.isLoading}
            onRetry={overview.onRetry}
          />
        </Card>

        <Card data-statistics-card="monsters" className="min-w-0 gap-0 py-0">
          <TopKilledNpcsPanel
            data={ranking.data}
            hasActiveFilters={hasActiveFilters}
            isError={ranking.isError}
            isLoading={ranking.isLoading}
            npcType={filters.npcType}
            onNpcTypeChange={onNpcTypeChange}
            onRetry={ranking.onRetry}
            onViewAll={onViewAll}
          />
        </Card>
      </div>
    </section>
  );
};
