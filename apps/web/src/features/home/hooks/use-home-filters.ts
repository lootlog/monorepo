import { useLocalStorage } from "usehooks-ts";
import type { NpcType } from "./use-player-kill-stats";
import type { TimeBucket } from "../../stats/components/time-bucket-select";

const STORAGE_KEY = "lootlog-home-filters";

export type HomeFilters = {
  world: string | undefined;
  npcType: NpcType;
  timeBucket: TimeBucket;
};

const DEFAULT_FILTERS: HomeFilters = {
  world: undefined,
  npcType: "ELITE2",
  timeBucket: "all",
};

export const useHomeFilters = () => {
  const [filters, setFilters] = useLocalStorage<HomeFilters>(
    STORAGE_KEY,
    DEFAULT_FILTERS,
  );

  const updateFilters = (updates: Partial<HomeFilters>) => {
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
