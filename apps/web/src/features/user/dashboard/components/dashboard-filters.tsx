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

type DashboardFiltersProps = {
  filters: DashboardFilters;
  onWorldChange: (world: string | undefined) => void;
};

export const DashboardFiltersBar: React.FC<DashboardFiltersProps> = ({
  filters,
  onWorldChange,
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
    <div className="flex items-center justify-end gap-3">
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
