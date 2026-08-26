import { useTranslation } from "react-i18next";
import type { DashboardFilters } from "../hooks/use-dashboard-filters";
import {
  KillStatsPeriodSelect,
  type KillStatsPeriod,
} from "@/features/kills/components/kill-stats-period-select";
import { WorldSwitcher } from "@/components/common/world-switcher";
import {
  getKillsControllerGetUserKillStatsQueryKey,
  useKillsControllerGetUserKillStats,
} from "@lootlog/api-client/react-query/main/kills";

type DashboardStatisticsFiltersProps = {
  filters: DashboardFilters;
  onWorldChange: (world: string | undefined) => void;
  onPeriodChange: (period: KillStatsPeriod) => void;
};

export const DashboardStatisticsFilters: React.FC<
  DashboardStatisticsFiltersProps
> = ({ filters, onWorldChange, onPeriodChange }) => {
  const { t } = useTranslation();
  const { data } = useKillsControllerGetUserKillStats(undefined, {
    query: {
      queryKey: getKillsControllerGetUserKillStatsQueryKey(),
      staleTime: 30_000,
    },
  });

  const availableWorlds = data?.overview.killsByWorld
    ? Object.keys(data.overview.killsByWorld)
    : [];
  const worlds = [
    ...(filters.world ? [filters.world] : []),
    ...availableWorlds.filter((world) => world !== filters.world),
  ].sort();

  const handleWorldChange = (value: string | null) => {
    onWorldChange(value ?? undefined);
  };

  return (
    <div
      role="group"
      aria-label={t("kills.playerStats.filtersLabel")}
      className="grid w-full shrink-0 grid-cols-2 gap-2 @2xl/statistics:w-auto @2xl/statistics:min-w-[21rem] @2xl/statistics:border-l @2xl/statistics:pl-4"
    >
      <div className="min-w-0 space-y-1">
        <span className="sr-only">{t("kills.filters.period")}</span>
        <KillStatsPeriodSelect
          value={filters.period}
          onValueChange={onPeriodChange}
          allLabel={t("kills.playerStats.allPeriod")}
          className="w-full"
          triggerClassName="h-11 w-full @2xl/statistics:h-9"
        />
      </div>
      <div className="min-w-0 space-y-1">
        <span className="sr-only">{t("kills.filters.world")}</span>
        <WorldSwitcher
          value={filters.world ?? null}
          onValueChange={handleWorldChange}
          showAllOption
          worlds={worlds}
          width="w-full"
          triggerClassName="h-11 w-full has-[>svg]:pr-4 @2xl/statistics:h-9"
        />
      </div>
    </div>
  );
};
