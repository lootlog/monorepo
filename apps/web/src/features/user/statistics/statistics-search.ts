import { z } from "zod";
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

export const parseStatisticsSearch = z
  .object({
    tab: z.enum(STATISTICS_TABS).catch("overview"),
    days: z.coerce
      .number()
      .transform(
        (days) => STATISTICS_DAYS.find((value) => value === days) ?? 30,
      )
      .catch(30),
    world: z
      .string()
      .transform((world) => world.trim().slice(0, 100) || undefined)
      .optional()
      .catch(undefined),
    characterId: z
      .string()
      .transform((id) => id.trim().slice(0, 100) || undefined)
      .optional()
      .catch(undefined),
    npcType: z
      .string()
      .transform((type) => TRACKABLE_NPC_TYPES.find((value) => value === type))
      .optional()
      .catch(undefined),
    sort: z.enum(STATISTICS_SORTS).optional().catch(undefined),
    q: z
      .string()
      .transform((q) => q.slice(0, 100) || undefined)
      .optional()
      .catch(undefined),
    asc: z
      .union([z.literal(true), z.literal("true")])
      .transform(() => true as const)
      .optional()
      .catch(undefined),
  })
  // A character id is unique only within its world, so it never stands alone.
  .transform((search) =>
    search.world ? search : { ...search, characterId: undefined },
  ).parse;
