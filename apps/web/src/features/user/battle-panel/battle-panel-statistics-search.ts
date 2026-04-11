import {
  parseAsBoolean,
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
} from "nuqs";
import type { Warrior } from "@/hooks/api/battle-log/use-search-warriors";
import type { Period } from "@/store/battle-filters.store";

const PERIOD_VALUES = [
  "24h",
  "3d",
  "7d",
  "14d",
  "30d",
  "90d",
  "180d",
  "all",
] as const satisfies Period[];

const HEAD_TO_HEAD_SORT_BY_VALUES = [
  "wins",
  "losses",
  "totalBattles",
  "winRate",
  "lastBattleDate",
  "totalRatingDelta",
  "avgRatingDelta",
] as const;

const SORT_ORDER_VALUES = ["asc", "desc"] as const;

export const battlePanelStatisticsSearchParsers = {
  characterId: parseAsString,
  period: parseAsStringLiteral(PERIOD_VALUES).withDefault("30d"),
  minLevel: parseAsInteger.withDefault(1),
  maxLevel: parseAsInteger.withDefault(500),
  ph: parseAsBoolean,
  matchmaking: parseAsBoolean,
};

export const battlePanelHeadToHeadSearchParsers = {
  ...battlePanelStatisticsSearchParsers,
  cursor: parseAsString,
  search: parseAsString,
  sortBy: parseAsStringLiteral(HEAD_TO_HEAD_SORT_BY_VALUES).withDefault(
    "totalBattles",
  ),
  sortOrder: parseAsStringLiteral(SORT_ORDER_VALUES).withDefault("desc"),
};

export const battlePanelPlayerVsPlayerSearchParsers = {
  ...battlePanelStatisticsSearchParsers,
  cursor: parseAsString,
};

const isPeriod = (value: string | null): value is Period => {
  return value !== null && PERIOD_VALUES.includes(value as Period);
};

const parseOptionalInteger = (value: string | null) => {
  if (!value) return undefined;

  const parsedValue = Number.parseInt(value, 10);
  return Number.isNaN(parsedValue) ? undefined : parsedValue;
};

const isHeadToHeadSortBy = (
  value: string | null,
): value is (typeof HEAD_TO_HEAD_SORT_BY_VALUES)[number] => {
  return (
    value !== null &&
    HEAD_TO_HEAD_SORT_BY_VALUES.includes(
      value as (typeof HEAD_TO_HEAD_SORT_BY_VALUES)[number],
    )
  );
};

const isSortOrder = (
  value: string | null,
): value is (typeof SORT_ORDER_VALUES)[number] => {
  return (
    value !== null &&
    SORT_ORDER_VALUES.includes(value as (typeof SORT_ORDER_VALUES)[number])
  );
};

export const getBattlePanelStatisticsSearch = (searchStr: string) => {
  const searchParams = new URLSearchParams(searchStr);
  const period = searchParams.get("period");

  return {
    characterId: searchParams.get("characterId") || undefined,
    period: isPeriod(period) ? period : "30d",
    minLevel: parseOptionalInteger(searchParams.get("minLevel")) ?? 1,
    maxLevel: parseOptionalInteger(searchParams.get("maxLevel")) ?? 500,
    ph: searchParams.get("ph") === "true" ? true : undefined,
    matchmaking: searchParams.get("matchmaking") === "true" ? true : undefined,
  };
};

export const getBattlePanelHeadToHeadSearch = (searchStr: string) => {
  const searchParams = new URLSearchParams(searchStr);
  const statisticsSearch = getBattlePanelStatisticsSearch(searchStr);
  const sortBy = searchParams.get("sortBy");
  const sortOrder = searchParams.get("sortOrder");

  return {
    ...statisticsSearch,
    cursor: searchParams.get("cursor") || undefined,
    search: searchParams.get("search") || undefined,
    sortBy: isHeadToHeadSortBy(sortBy) ? sortBy : "totalBattles",
    sortOrder: isSortOrder(sortOrder) ? sortOrder : "desc",
  };
};

export const getBattlePanelPlayerVsPlayerSearch = (searchStr: string) => {
  const searchParams = new URLSearchParams(searchStr);
  const statisticsSearch = getBattlePanelStatisticsSearch(searchStr);

  return {
    ...statisticsSearch,
    cursor: searchParams.get("cursor") || undefined,
  };
};

export const getSelectedWarriorsFromSearch = (
  search: string | undefined,
): Warrior[] => {
  if (!search) return [];

  return search
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean)
    .map((name) => ({
      name,
      icon: "",
      prof: "",
      lvl: 0,
    }));
};
