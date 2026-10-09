import type { InfiniteData, QueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { getShortnameByProf } from "@lootlog/domain/profession";
import {
  getLootsControllerFetchLootByIdQueryKey,
  type LootsControllerFetchLootsByGuildIdParams,
} from "@lootlog/client/main";
import type { Loot } from "@/lib/loots/loot-types";

export const LOOTS_QUERY_GC_TIME_MS = 5 * 60_000;

export const LOOTS_PAGE_LIMIT = 20;

type LootsInfiniteData = InfiniteData<Loot[]>;

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
  allowed: readonly string[] | undefined,
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
  params: LootsControllerFetchLootsByGuildIdParams,
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

// Lists are ordered by descending id. A loot older than every loaded one
// belongs to a page that has not been read yet, unless the list is complete.
const placeLoot = (
  data: LootsInfiniteData | undefined,
  loot: Loot,
): LootsInfiniteData | undefined => {
  const lastIndex = (data?.pages.length ?? 0) - 1;

  if (!data || lastIndex < 0) return data;

  if (data.pages.some((page) => page.some((entry) => entry.id === loot.id)))
    return {
      ...data,
      pages: data.pages.map((page) =>
        page.map((entry) => (entry.id === loot.id ? loot : entry)),
      ),
    };

  const pageIndex = data.pages.findIndex((page) =>
    page.some((entry) => entry.id < loot.id),
  );

  if (
    pageIndex === -1 &&
    (data.pages[lastIndex]?.length ?? 0) >= LOOTS_PAGE_LIMIT
  )
    return data;

  return {
    ...data,
    pages: data.pages.map((page, index) => {
      if (pageIndex === -1) return index === lastIndex ? [...page, loot] : page;

      if (index !== pageIndex) return page;
      const position = page.findIndex((entry) => entry.id < loot.id);

      return [...page.slice(0, position), loot, ...page.slice(position)];
    }),
  };
};

const cachedLootLists = (queryClient: QueryClient, guildId: string) => {
  const path = `/guilds/${guildId}/loots`;

  return queryClient
    .getQueriesData<LootsInfiniteData>({ queryKey: [path] })
    .filter(([key]) => key[0] === path);
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

export function patchLootShare(
  queryClient: QueryClient,
  guildId: string,
  lootId: number,
  lootShare: Loot["lootShare"],
) {
  for (const [key] of cachedLootLists(queryClient, guildId)) {
    queryClient.setQueryData<LootsInfiniteData>(key, (old) =>
      old?.pages.some((page) => page.some((loot) => loot.id === lootId))
        ? {
            ...old,
            pages: old.pages.map((page) =>
              page.map((loot) =>
                loot.id === lootId ? { ...loot, lootShare } : loot,
              ),
            ),
          }
        : old,
    );
  }

  queryClient.setQueryData<Loot | null>(
    getLootsControllerFetchLootByIdQueryKey({ guildId, lootId }),
    (old) => (old ? { ...old, lootShare } : old),
  );
}

export async function reconcileActiveLootLists(
  queryClient: QueryClient,
  guildId: string,
) {
  const queryKey = [`/guilds/${guildId}/loots`];
  await queryClient.cancelQueries({ queryKey, type: "active" });

  for (const [key] of queryClient.getQueriesData({
    queryKey,
    type: "active",
  })) {
    queryClient.setQueryData<InfiniteData<Loot[]>>(key, (old) =>
      old
        ? {
            pages: old.pages.slice(0, 1),
            pageParams: [0],
          }
        : old,
    );
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

  for (const [key] of queryClient.getQueriesData({
    ...filters,
    type: "active",
  })) {
    const isList = z.string().endsWith("/loots").safeParse(key[0]).success;
    queryClient.setQueryData(
      key,
      isList ? { pages: [], pageParams: [] } : null,
    );
  }

  await queryClient.invalidateQueries({ ...filters, refetchType: "none" });
}
