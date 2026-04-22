import { useLocalStorage } from "usehooks-ts";
import type { NpcType } from "@/features/user/kills/npc-types";

const DASHBOARD_FILTERS_STORAGE_KEY = "lootlog-home-filters";

export type DashboardFilters = {
  world: string | undefined;
  npcType: NpcType;
};

const DEFAULT_FILTERS: DashboardFilters = {
  world: undefined,
  npcType: "ELITE2",
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
    filters,
    setFilters,
    updateFilters,
    resetFilters,
  };
};
