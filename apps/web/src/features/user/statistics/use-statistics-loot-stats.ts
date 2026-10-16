import { useLootsControllerGetUserLootStats } from "@lootlog/client/main";
import type { StatisticsSearch } from "./statistics-search";

/** Loots of the user's fights in the statistics' period, world and character. */
export const useStatisticsLootStats = (search: StatisticsSearch) =>
  useLootsControllerGetUserLootStats(
    {
      days: ({ 7: "7", 30: "30", 90: "90", 365: "365" } as const)[search.days],
      world: search.world,
      characterId: search.characterId,
    },
    { query: { staleTime: 30_000 } },
  );
