import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@lootlog/ui/components/select";
import type { DashboardFilters } from "../hooks/use-dashboard-filters";
import {
  getKillsControllerGetUserKillStatsQueryKey,
  useKillsControllerGetUserKillStats,
} from "@/lib/api/generated/main/kills/kills";
import {
  KillStatsPeriodSelect,
  type KillStatsPeriod,
} from "@/features/kills/components/kill-stats-period-select";

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

  const handleWorldChange = (value: string) => {
    onWorldChange(value === "all" ? undefined : value);
  };

  return (
    <div className="flex flex-wrap items-center justify-start gap-3 md:justify-end">
      <KillStatsPeriodSelect
        value={filters.period}
        onValueChange={onPeriodChange}
      />
      <Select value={filters.world ?? "all"} onValueChange={handleWorldChange}>
        <SelectTrigger className="w-[180px]">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <SelectValue placeholder={t("kills.home.filters.allWorlds")} />
          </div>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">
            {t("kills.home.filters.allWorlds")}
          </SelectItem>
          {worlds.map((world) => (
            <SelectItem key={world} value={world}>
              {world.charAt(0).toUpperCase() + world.slice(1)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
