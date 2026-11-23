import type {
  InfiniteData,
  QueryClient,
  QueryKey,
} from "@tanstack/react-query";
import { Option, Schema } from "effect";
import { getShortnameByProf } from "@lootlog/domain/profession";
import {
  getLootsControllerFetchLootByIdQueryKey,
  getLootsControllerFetchLootsByGuildIdQueryKey,
  type LootPageResponseDto,
  type LootsControllerFetchLootsByGuildIdParams,
} from "@lootlog/client/main";
import type { Loot } from "@/lib/loots/loot-types";

export const LOOTS_QUERY_GC_TIME_MS = 5 * 60_000;

export const LOOTS_PAGE_LIMIT = 20;

export const FIRST_PAGE_CURSOR = "";

type LootsInfiniteData = InfiniteData<LootPageResponseDto>;

const LOOT_LIST_KEY_SCOPE = "infinite";

export const lootListQueryKey = (
  guildId: string,
  params: LootsControllerFetchLootsByGuildIdParams,
) =>
  [
    ...getLootsControllerFetchLootsByGuildIdQueryKey({ guildId }, params),
    LOOT_LIST_KEY_SCOPE,
  ] as const;

const isLootListKey = (queryKey: QueryKey) =>
  queryKey[2] === LOOT_LIST_KEY_SCOPE;

const LootListParams = Schema.Struct({
  world: Schema.optional(Schema.String),
  hid: Schema.optional(Schema.String),
  search: Schema.optional(Schema.String),
  npcs: Schema.optional(Schema.Array(Schema.String)),
  npcTypes: Schema.optional(Schema.Array(Schema.String)),
  players: Schema.optional(Schema.Array(Schema.String)),
  rarities: Schema.optional(Schema.Array(Schema.String)),
  professions: Schema.optional(Schema.Array(Schema.String)),
  itemNames: Schema.optional(Schema.Array(Schema.String)),
  npcLevelMin: Schema.optional(Schema.Finite),
  npcLevelMax: Schema.optional(Schema.Finite),
  itemLevelMin: Schema.optional(Schema.Finite),
  itemLevelMax: Schema.optional(Schema.Finite),
  playerLevelMin: Schema.optional(Schema.Finite),
  playerLevelMax: Schema.optional(Schema.Finite),
});

const decodeLootListParams = Schema.decodeUnknownOption(LootListParams);

const someIn = (
  allowed: ReadonlyArray<string> | undefined,
  values: ReadonlyArray<string | null>,
) =>
  !allowed?.length || values.some((value) => value && allowed.includes(value));

const someInRange = (
  levels: ReadonlyArray<number | null>,
  min: number | undefined,
  max: number | undefined,
) =>
  (min === undefined && max === undefined) ||
  levels.some(
    (level) =>
      level !== null &&
      (min === undefined || level >= min) &&
      (max === undefined || level <= max),
  );

export function lootMatchesListParams(
  loot: Loot,
  params: typeof LootListParams.Type,
): boolean | undefined {
  if (params.search?.trim()) return undefined;

  const professions = params.professions?.filter(getShortnameByProf);

  const itemNames = params.itemNames
    ?.map((name) => name.trim())
    .filter(Boolean);

  return (
    (!params.world || loot.world === params.world) &&
    (!params.hid || loot.items.some((item) => item.hid === params.hid)) &&
    someIn(
      params.npcs,
      loot.npcs.map((npc) => npc.name),
    ) &&
    someIn(
      params.npcTypes,
      loot.npcs.map((npc) => npc.type),
    ) &&
    someIn(
      params.players,
      loot.players.map((player) => player.name),
    ) &&
    someIn(
      params.rarities,
      loot.items.map((item) => item.rarity),
    ) &&
    someIn(
      itemNames,
      loot.items.map((item) => item.name),
    ) &&
    (!professions?.length ||
      loot.items.some(
        (item) =>
          item.prof.length === 0 ||
          item.prof.some((profession) => professions.includes(profession)),
      )) &&
    someInRange(
      loot.npcs.map((npc) => npc.lvl),
      params.npcLevelMin,
      params.npcLevelMax,
    ) &&
    someInRange(
      loot.items.map((item) => item.lvl),
      params.itemLevelMin,
      params.itemLevelMax,
    ) &&
    someInRange(
      loot.players.map((player) => player.lvl),
      params.playerLevelMin,
      params.playerLevelMax,
    )
  );
}

const withItems = (
  page: LootPageResponseDto,
  items: LootPageResponseDto["items"],
): LootPageResponseDto => ({ ...page, items });

const placeLoot = (
  data: LootsInfiniteData | undefined,
  loot: Loot,
): LootsInfiniteData | undefined => {
  const lastIndex = (data?.pages.length ?? 0) - 1;

  if (!data || lastIndex < 0) return data;

  if (
    data.pages.some((page) => page.items.some((entry) => entry.id === loot.id))
  )
    return {
      ...data,
      pages: data.pages.map((page) =>
        withItems(
          page,
          page.items.map((entry) => (entry.id === loot.id ? loot : entry)),
        ),
      ),
    };

  const pageIndex = data.pages.findIndex((page) =>
    page.items.some((entry) => entry.id < loot.id),
  );

  if (pageIndex === -1 && data.pages[lastIndex]?.nextCursor !== null)
    return data;

  return {
    ...data,
    pages: data.pages.map((page, index) => {
      if (pageIndex === -1)
        return index === lastIndex
          ? withItems(page, [...page.items, loot])
          : page;

      if (index !== pageIndex) return page;
      const position = page.items.findIndex((entry) => entry.id < loot.id);

      return withItems(page, [
        ...page.items.slice(0, position),
        loot,
        ...page.items.slice(position),
      ]);
    }),
  };
};

export const lootListsPath = (guildId: string) => `/guilds/${guildId}/loots`;

const cachedLootLists = (
  queryClient: QueryClient,
  guildId: string,
  type: "all" | "active" = "all",
) =>
  queryClient
    .getQueriesData<LootsInfiniteData>({
      queryKey: [lootListsPath(guildId)],
      type,
      predicate: ({ queryKey }) => isLootListKey(queryKey),
    })
    .flatMap(([key, data]) => (data ? [{ key, data }] : []));

export const subscribeToLootLists = (
  queryClient: QueryClient,
  guildId: string,
  onChange: () => void,
) =>
  queryClient.getQueryCache().subscribe(({ query: { queryKey } }) => {
    if (queryKey[0] === lootListsPath(guildId) && isLootListKey(queryKey))
      onChange();
  });

export const findCachedLoot = (
  queryClient: QueryClient,
  guildId: string,
  lootId: number,
) =>
  cachedLootLists(queryClient, guildId)
    .flatMap(({ data }) => data.pages)
    .flatMap((page) => page.items)
    .find((loot) => loot.id === lootId);

export function applyLootSnapshots(
  queryClient: QueryClient,
  guildId: string,
  loots: readonly Loot[],
): boolean {
  let needsServer = false;

  for (const { key } of cachedLootLists(queryClient, guildId)) {
    const params = decodeLootListParams(key[1] ?? {});

    for (const loot of loots) {
      const matches = Option.isSome(params)
        ? lootMatchesListParams(loot, params.value)
        : undefined;

      if (matches === undefined) {
        needsServer = true;
        void queryClient.invalidateQueries({
          queryKey: key,
          exact: true,
          refetchType: "none",
        });
      } else if (matches) {
        queryClient.setQueryData<LootsInfiniteData>(key, (old) =>
          placeLoot(old, loot),
        );
      }
    }
  }

  for (const loot of loots) {
    queryClient.setQueryData<Loot | null>(
      getLootsControllerFetchLootByIdQueryKey({ guildId, lootId: loot.id }),
      loot,
    );
  }

  return needsServer;
}

export function patchLoot(
  queryClient: QueryClient,
  guildId: string,
  lootId: number,
  patch: Partial<Pick<Loot, "lootShare" | "likes" | "standingDraws">>,
) {
  const apply = (loot: Loot): Loot => ({ ...loot, ...patch });

  for (const { key } of cachedLootLists(queryClient, guildId)) {
    queryClient.setQueryData<LootsInfiniteData>(key, (old) =>
      old?.pages.some((page) => page.items.some((loot) => loot.id === lootId))
        ? {
            ...old,
            pages: old.pages.map((page) =>
              withItems(
                page,
                page.items.map((loot) =>
                  loot.id === lootId ? apply(loot) : loot,
                ),
              ),
            ),
          }
        : old,
    );
  }

  queryClient.setQueryData<Loot | null>(
    getLootsControllerFetchLootByIdQueryKey({ guildId, lootId }),
    (old) => (old ? apply(old) : old),
  );
}

export async function reconcileActiveLootLists(
  queryClient: QueryClient,
  guildId: string,
) {
  const queryKey = [lootListsPath(guildId)];
  await queryClient.cancelQueries({ queryKey, type: "active" });

  for (const { key, data } of cachedLootLists(queryClient, guildId, "active")) {
    queryClient.setQueryData<LootsInfiniteData>(key, {
      pages: data.pages.slice(0, 1),
      pageParams: [FIRST_PAGE_CURSOR],
    });
  }

  await queryClient.invalidateQueries(
    { queryKey, refetchType: "active" },
    { throwOnError: true, cancelRefetch: false },
  );
}

const isLootPath = Schema.is(
  Schema.String.check(Schema.isPattern(/^\/guilds\/[^/]+\/loots(?:\/\d+)?$/)),
);

const isLootPagePath = Schema.is(
  Schema.String.check(Schema.isPattern(/\/loots$/)),
);

const emptyLootData = (queryKey: QueryKey) => {
  if (isLootListKey(queryKey)) return { pages: [], pageParams: [] };

  return isLootPagePath(queryKey[0]) ? { items: [], nextCursor: null } : null;
};

export async function clearLootPolicyData(
  queryClient: QueryClient,
  organizationRoutes?: readonly string[],
) {
  const paths = organizationRoutes?.map(lootListsPath);

  const filters = {
    predicate: (query: { queryKey: readonly unknown[] }) => {
      const [key] = query.queryKey;

      return (
        isLootPath(key) &&
        (paths === undefined ||
          paths.some((path) => key === path || key.startsWith(`${path}/`)))
      );
    },
  };

  await queryClient.cancelQueries(filters);
  queryClient.removeQueries({ ...filters, type: "inactive" });

  for (const [key] of queryClient.getQueriesData({
    ...filters,
    type: "active",
  })) {
    queryClient.setQueryData(key, emptyLootData(key));
  }

  await queryClient.invalidateQueries({ ...filters, refetchType: "none" });
}
