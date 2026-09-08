import { z } from "zod";
import type { SearchWarrior } from "@/lib/api/battlelog-types";
import {
  createLoader,
  createStandardSchemaV1,
  parseAsArrayOf,
  parseAsBoolean,
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
} from "nuqs";

export const BATTLE_PANEL_FIRST_PAGE = 1;

export const PERIOD_VALUES = [
  "24h",
  "3d",
  "7d",
  "14d",
  "30d",
  "90d",
  "180d",
  "all",
] as const;

export const HEAD_TO_HEAD_SORT_BY_VALUES = [
  "wins",
  "losses",
  "totalBattles",
  "winRate",
  "lastBattleDate",
  "totalRatingDelta",
  "avgRatingDelta",
] as const;

const SORT_ORDER_VALUES = ["asc", "desc"] as const;
const ABYSS_TAB_VALUES = ["battles", "analytics", "seasons"] as const;
const BATTLE_TYPE_VALUES = ["solo", "group"] as const;
const BATTLE_RESULT_VALUES = ["won", "lost", "flee"] as const;

export type AbyssTab = (typeof ABYSS_TAB_VALUES)[number];
type BattlePanelBattleResult = (typeof BATTLE_RESULT_VALUES)[number];
type BattlePanelBattleType = (typeof BATTLE_TYPE_VALUES)[number];
type BattlePanelBattlesRouteSearch = Partial<{
  cursor: string;
  page: number;
  world: string;
  type: BattlePanelBattleType[];
  search: string;
  result: BattlePanelBattleResult[];
  ph: boolean;
  startDate: string;
  endDate: string;
  characterId: string[];
  minLevel: number;
  maxLevel: number;
}>;
export type HeadToHeadSortBy = (typeof HEAD_TO_HEAD_SORT_BY_VALUES)[number];
export type Period = (typeof PERIOD_VALUES)[number];

const battlePanelBaseSearchParsers = {
  characterId: parseAsString,
  period: parseAsStringLiteral(PERIOD_VALUES).withDefault("30d"),
  minLevel: parseAsInteger.withDefault(1),
  maxLevel: parseAsInteger.withDefault(500),
  startDate: parseAsString,
  endDate: parseAsString,
  ph: parseAsBoolean,
  matchmaking: parseAsBoolean,
};

const battlePanelCursorSearchParsers = {
  cursor: parseAsString,
  page: parseAsInteger.withDefault(BATTLE_PANEL_FIRST_PAGE),
};

export const battlePanelBattlesSearchParsers = {
  ...battlePanelCursorSearchParsers,
  world: parseAsString,
  type: parseAsArrayOf(parseAsStringLiteral(BATTLE_TYPE_VALUES)),
  search: parseAsString,
  result: parseAsArrayOf(parseAsStringLiteral(BATTLE_RESULT_VALUES)),
  ph: parseAsBoolean,
  startDate: parseAsString,
  endDate: parseAsString,
  characterId: parseAsArrayOf(parseAsString),
  minLevel: parseAsInteger.withDefault(1),
  maxLevel: parseAsInteger.withDefault(500),
};

export const battlePanelStatisticsSearchParsers = {
  ...battlePanelBaseSearchParsers,
};

export const battlePanelAbyssSearchParsers = {
  characterId: parseAsString,
  tab: parseAsStringLiteral(ABYSS_TAB_VALUES).withDefault("battles"),
  seasonId: parseAsString,
  startDate: parseAsString,
  endDate: parseAsString,
  minLevel: parseAsInteger.withDefault(1),
  maxLevel: parseAsInteger.withDefault(500),
  ...battlePanelCursorSearchParsers,
};

export const battlePanelHeadToHeadSearchParsers = {
  ...battlePanelBaseSearchParsers,
  ...battlePanelCursorSearchParsers,
  search: parseAsString,
  sortBy: parseAsStringLiteral(HEAD_TO_HEAD_SORT_BY_VALUES).withDefault(
    "totalBattles",
  ),
  sortOrder: parseAsStringLiteral(SORT_ORDER_VALUES).withDefault("desc"),
};

export const battlePanelPlayerVsPlayerSearchParsers = {
  ...battlePanelBaseSearchParsers,
  ...battlePanelCursorSearchParsers,
};

export const battlePanelSingleBattleSearchParsers = {
  turn: parseAsInteger,
};

const routeSearchString = z
  .union([
    z.string(),
    z
      .array(z.string().optional().catch(undefined))
      .transform((values) => values.find((value) => value !== undefined)),
  ])
  .optional()
  .catch(undefined);

const routeSearchStrings = z
  .union([
    z.string().transform((value) => [value]),
    z.array(z.string().optional().catch(undefined)),
  ])
  .catch([])
  .transform((values) => {
    const parts = values.flatMap(
      (value) =>
        value
          ?.split(",")
          .map((part) => part.trim())
          .filter(Boolean) ?? [],
    );
    return parts.length ? parts : undefined;
  });

const routeSearchLiterals = <Value extends string>(allowed: readonly Value[]) =>
  routeSearchStrings.transform((values) => {
    const selected = values?.filter((value): value is Value =>
      allowed.some((candidate) => candidate === value),
    );
    return selected?.length ? selected : undefined;
  });

const routeSearchInteger = z
  .union([
    z.number(),
    routeSearchString.transform((value) => {
      const parsed = value ? Number.parseInt(value, 10) : Number.NaN;
      return Number.isNaN(parsed) ? undefined : parsed;
    }),
  ])
  .catch(undefined);

const routeSearchBoolean = z
  .union([
    z.boolean(),
    routeSearchString.transform((value) => {
      if (value === "true") return true;
      if (value === "false") return false;
      return undefined;
    }),
  ])
  .catch(undefined);

const battlePanelBattlesRouteSearch = z
  .object({
    cursor: routeSearchString,
    page: routeSearchInteger,
    world: routeSearchString,
    type: routeSearchLiterals(BATTLE_TYPE_VALUES),
    search: routeSearchString,
    result: routeSearchLiterals(BATTLE_RESULT_VALUES),
    ph: routeSearchBoolean,
    startDate: routeSearchString,
    endDate: routeSearchString,
    characterId: routeSearchStrings,
    minLevel: routeSearchInteger,
    maxLevel: routeSearchInteger,
  })
  .partial()
  .catch({})
  .transform((input): BattlePanelBattlesRouteSearch => {
    const search: BattlePanelBattlesRouteSearch = {};
    if (input.cursor !== undefined) search.cursor = input.cursor;
    if (input.page !== undefined) search.page = input.page;
    if (input.world !== undefined) search.world = input.world;
    if (input.type !== undefined) search.type = input.type;
    if (input.search !== undefined) search.search = input.search;
    if (input.result !== undefined) search.result = input.result;
    if (input.ph !== undefined) search.ph = input.ph;
    if (input.startDate !== undefined) search.startDate = input.startDate;
    if (input.endDate !== undefined) search.endDate = input.endDate;
    if (input.characterId !== undefined) search.characterId = input.characterId;
    if (input.minLevel !== undefined) search.minLevel = input.minLevel;
    if (input.maxLevel !== undefined) search.maxLevel = input.maxLevel;
    return search;
  });

export const battlePanelBattlesSearchSchema = {
  "~standard": {
    version: 1 as const,
    vendor: "lootlog",
    validate(input: Parameters<typeof battlePanelBattlesRouteSearch.parse>[0]) {
      return { value: battlePanelBattlesRouteSearch.parse(input) };
    },
  },
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

export const battlePanelAbyssSearchSchema = createStandardSchemaV1(
  battlePanelAbyssSearchParsers,
  {
    partialOutput: true,
  },
);

export const battlePanelSingleBattleSearchSchema = createStandardSchemaV1(
  battlePanelSingleBattleSearchParsers,
  {
    partialOutput: true,
  },
);

export const loadBattlePanelBattlesSearch = createLoader(
  battlePanelBattlesSearchParsers,
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

export const loadBattlePanelAbyssSearch = createLoader(
  battlePanelAbyssSearchParsers,
);

export const loadBattlePanelSingleBattleSearch = createLoader(
  battlePanelSingleBattleSearchParsers,
);

export const getBattlePanelPageIndex = (page: number): number =>
  Math.max(page, BATTLE_PANEL_FIRST_PAGE) - 1;

export const resetBattlePanelCursorPagination = () => ({
  cursor: null,
  page: BATTLE_PANEL_FIRST_PAGE,
});

export const getNextBattlePanelPage = (page: number): number =>
  Math.max(page, BATTLE_PANEL_FIRST_PAGE) + 1;

export const getPreviousBattlePanelPage = (page: number): number =>
  Math.max(page - 1, BATTLE_PANEL_FIRST_PAGE);

export const getBattlePanelCursorPaginationForCursor = ({
  currentPage,
  nextCursor,
  previousCursor,
  targetCursor,
}: {
  currentPage: number;
  nextCursor?: string;
  previousCursor?: string;
  targetCursor: string | undefined;
}) => {
  if (!targetCursor) {
    return resetBattlePanelCursorPagination();
  }

  if (targetCursor === nextCursor) {
    return {
      cursor: targetCursor,
      page: getNextBattlePanelPage(currentPage),
    };
  }

  if (targetCursor === previousCursor) {
    return {
      cursor: targetCursor,
      page: getPreviousBattlePanelPage(currentPage),
    };
  }

  return {
    cursor: targetCursor,
    page: Math.max(currentPage, BATTLE_PANEL_FIRST_PAGE),
  };
};

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
): SearchWarrior[] => {
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
