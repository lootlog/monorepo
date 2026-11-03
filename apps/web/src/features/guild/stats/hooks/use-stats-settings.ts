import {
  createLoader,
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
  useQueryState,
  type inferParserType,
} from "nuqs";
import { useEffect, useRef, useState } from "react";
import { useDebounceCallback } from "usehooks-ts";
import { createQueryFilters } from "@/hooks/create-query-filters";
import { useGuildWorld } from "@/hooks/context/use-guild-world";
import { KILLED_NPC_TYPES, type KilledNpcType } from "@/constants/npc";
import {
  KILL_STATS_PERIODS,
  type KillStatsPeriod,
} from "@/features/kills/components/kill-stats-period-select";

// An absent key is the default, so a default never reads as an active filter.
const statsSearchParsers = {
  minLvl: parseAsString.withDefault(""),
  maxLvl: parseAsString.withDefault(""),
  npcType: parseAsStringLiteral(KILLED_NPC_TYPES),
  period: parseAsStringLiteral(KILL_STATS_PERIODS),
  search: parseAsString.withDefault(""),
};

const useStatsFilters = createQueryFilters(statsSearchParsers);

const loadStatsSearch = createLoader(statsSearchParsers);

const SEARCH_PUBLISH_DELAY_MS = 500;

/** A stats page's filters, with the Organization's world they apply to. */
export type StatsSettings = {
  minLvl: string;
  maxLvl: string;
  npcType: KilledNpcType | "ALL";
  period: KillStatsPeriod;
  search: string;
  world: string | null;
};

const toStatsSettings = (
  search: inferParserType<typeof statsSearchParsers>,
  world: string | null,
): StatsSettings => ({
  minLvl: search.minLvl,
  maxLvl: search.maxLvl,
  npcType: search.npcType ?? "ALL",
  period: search.period ?? "all",
  search: search.search,
  world,
});

/** The settings a stats route's loader prefetches for, read from its URL. */
export const readStatsSettings = (searchStr: string, world: string | null) =>
  toStatsSettings(loadStatsSearch(searchStr), world);

/**
 * A stats page's filters and list page in its URL. The search input keeps a
 * draft; the URL follows once typing pauses.
 */
export const useStatsSettings = () => {
  const { world } = useGuildWorld();

  const { filters, setFilters, hasActiveFilters, clearFilters } =
    useStatsFilters();

  const [page, setPage] = useQueryState(
    "page",
    parseAsInteger.withOptions({ history: "push" }),
  );

  const [searchDraft, setSearchDraft] = useState(filters.search);

  const publishSearch = useDebounceCallback((search: string) => {
    void setFilters({ search: search.trim() || null }, { history: "replace" });
    void setPage(null);
  }, SEARCH_PUBLISH_DELAY_MS);

  // The page belongs to the world it was picked on.
  const pageWorld = useRef(world);

  useEffect(() => {
    if (pageWorld.current === world) return;

    pageWorld.current = world;
    void setPage(null);
  }, [world, setPage]);

  // Every filter change starts the list over.
  const updateFilters = (next: Parameters<typeof setFilters>[0]) => {
    void setFilters(next);
    void setPage(null);
  };

  return {
    settings: toStatsSettings(filters, world),
    searchDraft,
    hasActiveFilters,
    /** Zero-based list page; the URL counts from 1. */
    pageIndex: Math.max((page ?? 1) - 1, 0),
    setPageIndex: (pageIndex: number) => {
      void setPage(pageIndex > 0 ? pageIndex + 1 : null);
    },
    setMinLvl: (minLvl: string) => updateFilters({ minLvl: minLvl || null }),
    setMaxLvl: (maxLvl: string) => updateFilters({ maxLvl: maxLvl || null }),
    setNpcType: (npcType: KilledNpcType | "ALL") =>
      updateFilters({ npcType: npcType === "ALL" ? null : npcType }),
    setPeriod: (period: KillStatsPeriod) =>
      updateFilters({ period: period === "all" ? null : period }),
    setSearch: (search: string) => {
      setSearchDraft(search);
      publishSearch(search);
    },
    resetFilters: () => {
      publishSearch.cancel();
      setSearchDraft("");
      clearFilters();
      void setPage(null);
    },
  };
};
