import {
  createLoader,
  createStandardSchemaV1,
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

export const battlePanelStatisticsSearchSchema = createStandardSchemaV1(
  battlePanelStatisticsSearchParsers,
  {
    partialOutput: true,
  },
);

export const battlePanelHeadToHeadSearchSchema = createStandardSchemaV1(
  battlePanelHeadToHeadSearchParsers,
  {
    partialOutput: true,
  },
);

export const battlePanelPlayerVsPlayerSearchSchema = createStandardSchemaV1(
  battlePanelPlayerVsPlayerSearchParsers,
  {
    partialOutput: true,
  },
);

export const loadBattlePanelStatisticsSearch = createLoader(
  battlePanelStatisticsSearchParsers,
);

export const loadBattlePanelHeadToHeadSearch = createLoader(
  battlePanelHeadToHeadSearchParsers,
);

export const loadBattlePanelPlayerVsPlayerSearch = createLoader(
  battlePanelPlayerVsPlayerSearchParsers,
);

export const normalizeBattlePanelCharacterId = (
  value: string | null | undefined,
) => {
  if (!value || value === "null") {
    return undefined;
  }

  return value;
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
