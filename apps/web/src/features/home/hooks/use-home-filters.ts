import { useLocalStorage } from "usehooks-ts";
import type { NpcType } from "./use-player-kill-stats";

const STORAGE_KEY = "lootlog-home-filters";

export type HomeFilters = {
  world: string | undefined;
  npcType: NpcType;
  characterId: number | undefined;
};

const DEFAULT_FILTERS: HomeFilters = {
  world: undefined,
  npcType: "ELITE2",
  characterId: undefined,
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
