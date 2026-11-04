import { Schema, SchemaTransformation } from "effect";
import {
  CoercedFinite,
  optionalWithFallback,
  withFallback,
} from "@/lib/lenient-schema";
import { TRACKABLE_NPC_TYPES } from "@/features/user/kills/npc-types";

export const STATISTICS_TABS = [
  "overview",
  "activity",
  "monsters",
  "loots",
  "legends",
] as const;

export const STATISTICS_DAYS = [7, 30, 90, 365] as const;

/** What a ranking tab can be sorted by; each tab offers some, its first by default. */
export const STATISTICS_SORT_FIELDS = {
  monsters: ["kills", "change", "legends", "caught"],
  legends: ["legends", "caught", "kills"],
} as const;

export const STATISTICS_SORTS = [
  "kills",
  "change",
  "legends",
  "caught",
] as const;

export type StatisticsSort = (typeof STATISTICS_SORTS)[number];

export type StatisticsSortTab = keyof typeof STATISTICS_SORT_FIELDS;

export type StatisticsTab = (typeof STATISTICS_TABS)[number];

export type StatisticsDays = (typeof STATISTICS_DAYS)[number];

export type StatisticsNpcType = (typeof TRACKABLE_NPC_TYPES)[number];

export type StatisticsSearch = {
  tab: StatisticsTab;
  days: StatisticsDays;
  world?: string;
  /** One Margonem character, counted since per-character tracking began. */
  characterId?: string;
  /** Narrows the monster ranking. */
  npcType?: StatisticsNpcType;
  /** The ranking's sort field; most first unless `asc`. */
  sort?: StatisticsSort;
  asc?: true;
  /** Narrows a ranking tab by name. */
  q?: string;
};

/** The tab's sort, falling back to its default when the URL names another tab's field. */
export const resolveStatisticsSort = (
  tab: StatisticsSortTab,
  search: Pick<StatisticsSearch, "sort" | "asc">,
) => {
  const fields: readonly StatisticsSort[] = STATISTICS_SORT_FIELDS[tab];

  return search.sort && fields.includes(search.sort)
    ? { field: search.sort, asc: search.asc === true }
    : { field: fields[0] ?? "kills", asc: false };
};

/** An optional search value, normalized; one it cannot use reads as missing. */
const optionalSearchValue = <To extends Schema.Codec<string>>(
  to: To,
  normalize: (value: string) => To["Type"] | undefined,
) =>
  optionalWithFallback(
    Schema.String.pipe(
      Schema.decodeTo(
        Schema.UndefinedOr(to),
        SchemaTransformation.transform<To["Type"] | undefined, string>({
          decode: normalize,
          encode: (value) => value ?? "",
        }),
      ),
    ),
  );

const searchText = (prepare: (value: string) => string) =>
  optionalSearchValue(
    Schema.String,
    (value) => prepare(value).slice(0, 100) || undefined,
  );

const StatisticsSearchSchema = Schema.Struct({
  tab: withFallback(Schema.Literals(STATISTICS_TABS), "overview"),
  days: withFallback(
    CoercedFinite.pipe(
      Schema.decodeTo(
        Schema.Literals(STATISTICS_DAYS),
        SchemaTransformation.transform<StatisticsDays, number>({
          decode: (days) =>
            STATISTICS_DAYS.find((value) => value === days) ?? 30,
          encode: (days) => days,
        }),
      ),
    ),
    30,
  ),
  world: searchText((world) => world.trim()),
  characterId: searchText((id) => id.trim()),
  npcType: optionalSearchValue(Schema.Literals(TRACKABLE_NPC_TYPES), (type) =>
    TRACKABLE_NPC_TYPES.find((value) => value === type),
  ),
  sort: optionalWithFallback(Schema.Literals(STATISTICS_SORTS)),
  q: searchText((q) => q),
  asc: optionalWithFallback(
    Schema.Literals([true, "true"]).pipe(
      Schema.decodeTo(
        Schema.Literal(true),
        SchemaTransformation.transform<true, true | "true">({
          decode: () => true,
          encode: (asc) => asc,
        }),
      ),
    ),
  ),
});

export const parseStatisticsSearch = Schema.decodeUnknownSync(
  StatisticsSearchSchema.pipe(
    Schema.decode(
      SchemaTransformation.transform<
        typeof StatisticsSearchSchema.Type,
        typeof StatisticsSearchSchema.Type
      >({
        // A character id is unique only within its world, so it never stands
        // alone.
        decode: (search) =>
          search.world ? search : { ...search, characterId: undefined },
        encode: (search) => search,
      }),
    ),
  ),
);
