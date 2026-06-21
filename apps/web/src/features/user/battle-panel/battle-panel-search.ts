import type { SearchWarrior } from "@/lib/api/battlelog-types";
import {
  createLoader,
  createSerializer,
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
type BattlePanelStandardSchemaResult<Output> =
  | { value: Output; issues?: undefined }
  | { issues: ReadonlyArray<{ message: string }> };
type BattlePanelStandardSchema<Output> = {
  "~standard": {
    version: 1;
    vendor: string;
    validate: (input: unknown) => BattlePanelStandardSchemaResult<Output>;
  };
};
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

const isSearchRecord = (input: unknown): input is Record<string, unknown> =>
  input !== null && typeof input === "object";

const getRouteSearchString = (value: unknown): string | undefined => {
  if (typeof value === "string") {
    return value;
  }

  if (!Array.isArray(value)) {
    return undefined;
  }

  return value.find((item): item is string => typeof item === "string");
};

const getRouteSearchStringArray = (value: unknown): string[] | undefined => {
  const rawValues = Array.isArray(value) ? value : [value];
  const parsedValues = rawValues.flatMap((item) => {
    if (typeof item !== "string") {
      return [];
    }

    return item
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
  });

  if (parsedValues.length === 0) {
    return undefined;
  }

  return parsedValues;
};

const getRouteSearchLiteralArray = <Value extends string>(
  value: unknown,
  allowedValues: readonly Value[],
): Value[] | undefined => {
  const parsedValues = getRouteSearchStringArray(value);

  if (!parsedValues) {
    return undefined;
  }

  const allowedValueSet = new Set<string>(allowedValues);
  const filteredValues = parsedValues.filter((item): item is Value =>
    allowedValueSet.has(item),
  );

  if (filteredValues.length === 0) {
    return undefined;
  }

  return filteredValues;
};

const getRouteSearchInteger = (value: unknown): number | undefined => {
  if (typeof value === "number") {
    if (Number.isFinite(value)) {
      return value;
    }

    return undefined;
  }

  const stringValue = getRouteSearchString(value);

  if (!stringValue) {
    return undefined;
  }

  const parsedValue = Number.parseInt(stringValue, 10);

  if (Number.isNaN(parsedValue)) {
    return undefined;
  }

  return parsedValue;
};

const getRouteSearchBoolean = (value: unknown): boolean | undefined => {
  if (typeof value === "boolean") {
    return value;
  }

  const stringValue = getRouteSearchString(value);

  if (stringValue === "true") {
    return true;
  }

  if (stringValue === "false") {
    return false;
  }

  return undefined;
};

const parseBattlePanelBattlesRouteSearch = (
  input: unknown,
): BattlePanelBattlesRouteSearch => {
  if (!isSearchRecord(input)) {
    return {};
  }

  const search: BattlePanelBattlesRouteSearch = {};
  const cursor = getRouteSearchString(input.cursor);
  const page = getRouteSearchInteger(input.page);
  const world = getRouteSearchString(input.world);
  const type = getRouteSearchLiteralArray(input.type, BATTLE_TYPE_VALUES);
  const warriorSearch = getRouteSearchString(input.search);
  const result = getRouteSearchLiteralArray(input.result, BATTLE_RESULT_VALUES);
  const ph = getRouteSearchBoolean(input.ph);
  const startDate = getRouteSearchString(input.startDate);
  const endDate = getRouteSearchString(input.endDate);
  const characterId = getRouteSearchStringArray(input.characterId);
  const minLevel = getRouteSearchInteger(input.minLevel);
  const maxLevel = getRouteSearchInteger(input.maxLevel);

  if (cursor !== undefined) search.cursor = cursor;
  if (page !== undefined) search.page = page;
  if (world !== undefined) search.world = world;
  if (type !== undefined) search.type = type;
  if (warriorSearch !== undefined) search.search = warriorSearch;
  if (result !== undefined) search.result = result;
  if (ph !== undefined) search.ph = ph;
  if (startDate !== undefined) search.startDate = startDate;
  if (endDate !== undefined) search.endDate = endDate;
  if (characterId !== undefined) search.characterId = characterId;
  if (minLevel !== undefined) search.minLevel = minLevel;
  if (maxLevel !== undefined) search.maxLevel = maxLevel;

  return search;
};

export const battlePanelBattlesSearchSchema = {
  "~standard": {
    version: 1,
    vendor: "lootlog",
    validate(input) {
      return {
        value: parseBattlePanelBattlesRouteSearch(input),
      };
    },
  },
} satisfies BattlePanelStandardSchema<BattlePanelBattlesRouteSearch>;

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

export const serializeBattlePanelBattlesSearch = createSerializer(
  battlePanelBattlesSearchParsers,
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
