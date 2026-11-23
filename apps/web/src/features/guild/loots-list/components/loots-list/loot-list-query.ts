import {
  lootsControllerFetchLootsByGuildId,
  LootsControllerFetchLootsByGuildIdNpcTypesItem,
  LootsControllerFetchLootsByGuildIdRaritiesItem,
  type LootsControllerFetchLootsByGuildIdParams,
} from "@lootlog/client/main";
import { infiniteQueryOptions } from "@tanstack/react-query";
import type { LootsFilters } from "@/hooks/use-loots-filters";
import {
  FIRST_PAGE_CURSOR,
  LOOTS_PAGE_LIMIT,
  LOOTS_QUERY_GC_TIME_MS,
  lootListQueryKey,
} from "./loot-list-cache";

const LOOTS_QUERY_STALE_TIME_MS = 30_000;

const parseOptionalNumber = (value: string) =>
  value.length > 0 ? Number(value) : undefined;

const optionalValues = <Value>(values: Value[]) =>
  values.length > 0 ? values : undefined;

const knownValues = <Value extends string>(
  allowed: Readonly<Record<string, Value>>,
  values: string[],
) => {
  const known: ReadonlySet<string> = new Set(Object.values(allowed));

  return optionalValues(
    values.filter((value): value is Value => known.has(value)),
  );
};

const optionalText = (value: string | null | undefined) =>
  value ? value : undefined;

export const getLootQueryParams = (
  filters: LootsFilters,
  world: string | null | undefined,
): LootsControllerFetchLootsByGuildIdParams => ({
  limit: LOOTS_PAGE_LIMIT,
  npcs: optionalValues(filters.npcs),
  npcTypes: knownValues(
    LootsControllerFetchLootsByGuildIdNpcTypesItem,
    filters.npcTypes,
  ),
  rarities: knownValues(
    LootsControllerFetchLootsByGuildIdRaritiesItem,
    filters.rarities,
  ),
  professions: optionalValues(filters.professions),
  players: optionalValues(filters.players),
  npcLevelMin: parseOptionalNumber(filters.npcLevelMin),
  npcLevelMax: parseOptionalNumber(filters.npcLevelMax),
  itemLevelMin: parseOptionalNumber(filters.itemLevelMin),
  itemLevelMax: parseOptionalNumber(filters.itemLevelMax),
  playerLevelMin: parseOptionalNumber(filters.playerLevelMin),
  playerLevelMax: parseOptionalNumber(filters.playerLevelMax),
  search: optionalText(filters.search),
  hid: optionalText(filters.hid),
  itemNames: optionalValues(filters.itemNames),
  world: optionalText(world),
});

export const lootListInfiniteQueryOptions = (
  guildId: string,
  params: LootsControllerFetchLootsByGuildIdParams,
) =>
  infiniteQueryOptions({
    queryKey: lootListQueryKey(guildId, params),
    queryFn: ({ pageParam, signal }) =>
      lootsControllerFetchLootsByGuildId(
        { guildId },
        { ...params, cursor: pageParam || undefined },
        { signal },
      ),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    initialPageParam: FIRST_PAGE_CURSOR,
    staleTime: LOOTS_QUERY_STALE_TIME_MS,
    gcTime: LOOTS_QUERY_GC_TIME_MS,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
