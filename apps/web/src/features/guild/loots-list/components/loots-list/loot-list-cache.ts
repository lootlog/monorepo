import type { InfiniteData, QueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { getShortnameByProf } from "@lootlog/domain/profession";
import {
  getLootsControllerFetchLootByIdQueryKey,
  type LootPageResponseDto,
} from "@lootlog/client/main";
import type { Loot } from "@/lib/loots/loot-types";

export const LOOTS_QUERY_GC_TIME_MS = 5 * 60_000;

export const LOOTS_PAGE_LIMIT = 20;

/** Page parameter of a list's first page, which is read without a cursor. */
export const FIRST_PAGE_CURSOR = "";

type LootsInfiniteData = InfiniteData<LootPageResponseDto>;

const LootListParams = z.object({
  world: z.string().optional(),
  hid: z.string().optional(),
  search: z.string().optional(),
  npcs: z.array(z.string()).optional(),
  npcTypes: z.array(z.string()).optional(),
  players: z.array(z.string()).optional(),
  rarities: z.array(z.string()).optional(),
  professions: z.array(z.string()).optional(),
  itemNames: z.array(z.string()).optional(),
  npcLevelMin: z.number().optional(),
  npcLevelMax: z.number().optional(),
  itemLevelMin: z.number().optional(),
  itemLevelMax: z.number().optional(),
  playerLevelMin: z.number().optional(),
  playerLevelMax: z.number().optional(),
});

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

/**
 * Mirrors the API's list filters. `undefined` means only the server can decide,
 * as for free-text search, which also matches snapshot names it resolves.
 */
export function lootMatchesListParams(
  loot: Loot,
  params: z.infer<typeof LootListParams>,
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
    // An item without a profession requirement suits every profession.
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

// Lists are ordered by descending id. A loot older than every loaded one
// belongs to a page that has not been read yet, unless the list is complete.
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

// Event pages and the HID lookup cache plain results under the same path as
// the paged lists, so lists are told apart by their data.
const LootPage = z.object({
  items: z.array(z.unknown()),
  nextCursor: z.string().nullable(),
});

const LootPages = z.object({ pages: z.array(LootPage) });

const isLootPages = (data: unknown): data is LootsInfiniteData =>
  LootPages.safeParse(data).success;

const cachedLootLists = (queryClient: QueryClient, guildId: string) => {
  const path = `/guilds/${guildId}/loots`;

  return queryClient
    .getQueriesData({ queryKey: [path] })
    .filter(([key, data]) => key[0] === path && isLootPages(data));
};

/**
 * Places loot snapshots in every cached list and detail of the Organization
 * without a request. Returns whether a list needs the server to place them.
 */
export function applyLootSnapshots(
  queryClient: QueryClient,
  guildId: string,
  loots: readonly Loot[],
): boolean {
  let needsServer = false;

  for (const [key] of cachedLootLists(queryClient, guildId)) {
    const params = LootListParams.safeParse(key[1] ?? {});

    for (const loot of loots) {
      const matches = params.success
        ? lootMatchesListParams(loot, params.data)
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

/** Updates fields of one loot in every cached list and detail of the Organization. */
export function patchLoot(
  queryClient: QueryClient,
  guildId: string,
  lootId: number,
  patch: Partial<Pick<Loot, "lootShare" | "likes">>,
) {
  for (const [key] of cachedLootLists(queryClient, guildId)) {
    queryClient.setQueryData<LootsInfiniteData>(key, (old) =>
      old?.pages.some((page) => page.items.some((loot) => loot.id === lootId))
        ? {
            ...old,
            pages: old.pages.map((page) =>
              withItems(
                page,
                page.items.map((loot) =>
                  loot.id === lootId ? { ...loot, ...patch } : loot,
                ),
              ),
            ),
          }
        : old,
    );
  }

  queryClient.setQueryData<Loot | null>(
    getLootsControllerFetchLootByIdQueryKey({ guildId, lootId }),
    (old) => (old ? { ...old, ...patch } : old),
  );
}

export async function reconcileActiveLootLists(
  queryClient: QueryClient,
  guildId: string,
) {
  const queryKey = [`/guilds/${guildId}/loots`];
  await queryClient.cancelQueries({ queryKey, type: "active" });

  for (const [key, data] of queryClient.getQueriesData({
    queryKey,
    type: "active",
  })) {
    if (!isLootPages(data)) continue;

    queryClient.setQueryData<LootsInfiniteData>(key, {
      pages: data.pages.slice(0, 1),
      pageParams: [FIRST_PAGE_CURSOR],
    });
  }

  // Inactive filters retain their history and become stale without HTTP work.
  await queryClient.invalidateQueries(
    { queryKey, refetchType: "active" },
    { throwOnError: true, cancelRefetch: false },
  );
}

export async function clearLootPolicyData(
  queryClient: QueryClient,
  organizationRoutes?: readonly string[],
) {
  const lootPath = z.string().regex(/^\/guilds\/[^/]+\/loots(?:\/\d+)?$/);
  const paths = organizationRoutes?.map((id) => `/guilds/${id}/loots`);

  const filters = {
    predicate: (query: { queryKey: readonly unknown[] }) => {
      const key = lootPath.safeParse(query.queryKey[0]);

      return (
        key.success &&
        (paths === undefined ||
          paths.some(
            (path) => key.data === path || key.data.startsWith(`${path}/`),
          ))
      );
    },
  };

  await queryClient.cancelQueries(filters);
  queryClient.removeQueries({ ...filters, type: "inactive" });

  for (const [key, data] of queryClient.getQueriesData({
    ...filters,
    type: "active",
  })) {
    queryClient.setQueryData(
      key,
      isLootPages(data)
        ? { pages: [], pageParams: [] }
        : LootPage.safeParse(data).success
          ? { items: [], nextCursor: null }
          : null,
    );
  }

  await queryClient.invalidateQueries({ ...filters, refetchType: "none" });
}
