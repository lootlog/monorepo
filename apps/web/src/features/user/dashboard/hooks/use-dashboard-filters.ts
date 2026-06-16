import { useLocalStorage } from "usehooks-ts";
import type { NpcType } from "@/features/user/kills/npc-types";
import type { KillStatsPeriod } from "@/features/kills/components/kill-stats-period-select";

const DASHBOARD_FILTERS_STORAGE_KEY = "lootlog-home-filters";

export type DashboardFilters = {
  world: string | undefined;
  npcType: NpcType;
  period: KillStatsPeriod;
};

const DEFAULT_FILTERS: DashboardFilters = {
  world: undefined,
  npcType: "ELITE2",
  period: "all",
};

export const useDashboardFilters = () => {
  const [filters, setFilters] = useLocalStorage<DashboardFilters>(
    DASHBOARD_FILTERS_STORAGE_KEY,
    DEFAULT_FILTERS,
  );

  const updateFilters = (updates: Partial<DashboardFilters>) => {
    setFilters((prev) => ({ ...prev, ...updates }));
  };

  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS);
  };

  return {
    filters: {
      ...filters,
      period: filters.period ?? "all",
    },
    setFilters,
    updateFilters,
    resetFilters,
  };
};
