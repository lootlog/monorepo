import { FilterPopover } from "@lootlog/ui/components/filter-popover";
import { useTranslation } from "react-i18next";
import {
  KillStatsPeriodSelect,
  type KillStatsPeriod,
} from "@/features/kills/components/kill-stats-period-select";
import type { DashboardFilters } from "../hooks/use-dashboard-filters";

type DashboardStatisticsFiltersProps = {
  availableWorlds: string[];
  filters: DashboardFilters;
  onPeriodChange: (period: KillStatsPeriod) => void;
  onWorldChange: (world: string | undefined) => void;
};

const ALL_WORLDS_VALUE = "__ALL_WORLDS__";

export const DashboardStatisticsFilters = ({
  availableWorlds,
  filters,
  onPeriodChange,
  onWorldChange,
}: DashboardStatisticsFiltersProps) => {
  const { t } = useTranslation();
  const worlds = [
    ...(filters.world ? [filters.world] : []),
    ...availableWorlds.filter((world) => world !== filters.world),
  ].sort();
  const worldOptions = [
    {
      label: t("kills.home.filters.allWorlds"),
      value: ALL_WORLDS_VALUE,
    },
    ...worlds.map((world) => ({
      label: world.charAt(0).toUpperCase() + world.slice(1),
      value: world,
    })),
  ];

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
        <FilterPopover
          options={worldOptions}
          value={filters.world ?? ALL_WORLDS_VALUE}
          onValueChange={(world) =>
            onWorldChange(
              world === ALL_WORLDS_VALUE ? undefined : (world as string),
            )
          }
          width="w-full"
          triggerClassName="h-11 w-full has-[>svg]:pr-4 @2xl/statistics:h-9"
          emptyMessage={t("common.noResults")}
          searchPlaceholder={t("common.search")}
        />
      </div>
    </div>
  );
};
