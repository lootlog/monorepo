import { parseAsBoolean, parseAsStringLiteral } from "nuqs";
import { createQueryFilters } from "@/hooks/create-query-filters";
import { useGuildWorld } from "@/hooks/context/use-guild-world";
import {
  LootsControllerGetLootStatsPeriod,
  type LootsControllerGetLootStatsPeriod as LootStatsPeriod,
} from "@lootlog/client/main";

export const DEFAULT_LOOT_STATS_PERIOD: LootStatsPeriod = "7d";

// An absent key is the default, so a default never reads as an active filter.
const useLootStatsFilters = createQueryFilters({
  period: parseAsStringLiteral(
    Object.values(LootsControllerGetLootStatsPeriod),
  ),
  excludeColossus: parseAsBoolean,
});

export const useLootStatsSettings = () => {
  const { world } = useGuildWorld();
  const { filters, setFilters, clearFilters } = useLootStatsFilters();

  return {
    // The page's own filters, with the Organization's world they apply to.
    settings: {
      period: filters.period ?? DEFAULT_LOOT_STATS_PERIOD,
      excludeColossus: filters.excludeColossus ?? false,
      world,
    },
    setPeriod: (period: LootStatsPeriod) => {
      void setFilters({
        period: period === DEFAULT_LOOT_STATS_PERIOD ? null : period,
      });
    },
    setExcludeColossus: (excludeColossus: boolean) => {
      void setFilters({ excludeColossus: excludeColossus || null });
    },
    resetFilters: clearFilters,
  };
};
