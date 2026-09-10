import { useGuildContext } from "@/hooks/context/use-guild-context";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { useLootsFilters } from "@/hooks/use-loots-filters";
import { useViewMode } from "@/hooks/use-view-mode";
import {
  useResetScrollTop,
  useVirtualInfiniteScroll,
} from "@/hooks/utils/use-virtual-infinite-scroll";
import type { Loot } from "@/lib/loots/loot-types";
import {
  getLootsControllerFetchLootByIdQueryKey,
  getLootsControllerFetchLootsByGuildIdQueryKey,
  lootsControllerFetchLootById,
  lootsControllerFetchLootsByGuildId,
  useUsersControllerGetCurrentUserAccessibleGuilds,
  type LootShareResponseDto,
  type LootsControllerFetchLootsByGuildIdParams,
} from "@lootlog/client/main";
import { z } from "zod";
import {
  LOOTS_QUERY_GC_TIME_MS,
  patchActiveLootLists,
} from "./loot-list-cache";

import { GatewayEvent } from "@/config/gateway";
import { useGateway } from "@/hooks/utils/use-gateway";
import { useThemedKey } from "@/themes";
import type {
  GuildLootCreatedEventV2,
  GuildLootShareUpdatedEventV2,
} from "@lootlog/schema/loot-events";
import {
  useInfiniteQuery,
  useQueryClient,
  type InfiniteData,
  type QueryKey,
} from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

const LOOTS_PAGE_LIMIT = 20;
const LOOTS_QUERY_STALE_TIME_MS = 30_000;
const GRID_COLUMNS = 2;
const EMPTY_LOOTS: Loot[] = [];
const EMPTY_GRID_ROWS: Loot[][] = [];

type LootsInfiniteData = InfiniteData<Loot[]>;
type LootFilters = ReturnType<typeof useLootsFilters>["filters"];

const parseOptionalNumber = (value: string) =>
  value.length > 0 ? Number(value) : undefined;

const optionalValues = <Value>(values: Value[]) =>
  values.length > 0 ? values : undefined;

const optionalText = (value: string | null | undefined) =>
  value ? value : undefined;

const getLootQueryParams = (
  filters: LootFilters,
  world: string | null | undefined,
): LootsControllerFetchLootsByGuildIdParams => ({
  limit: LOOTS_PAGE_LIMIT,
  npcs: optionalValues(filters.npcs),
  npcTypes: optionalValues(filters.npcTypes),
  rarities: optionalValues(filters.rarities),
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

const getCurrentGuildId = (
  guilds: Array<{ id: string; vanityUrl?: string | null }> | undefined,
  guildId: string | undefined,
) =>
  guilds?.find((guild) => guild.id === guildId || guild.vanityUrl === guildId)
    ?.id ?? guildId;

const getLootPages = (loots: LootsInfiniteData | undefined) => loots?.pages;

const hasInitialLoots = (loots: LootsInfiniteData | undefined) =>
  (loots?.pages?.[0]?.length ?? 0) > 0;

const includesAll = <T>(values: T[] | undefined, expected: T[]) => {
  if (!values?.length) {
    return true;
  }

  const valueSet = new Set(values);
  return expected.some((value) => valueSet.has(value));
};

const compact = <T>(values: Array<T | null | undefined>) =>
  values.filter((value): value is T => value !== null && value !== undefined);

const isInRange = (
  value: number | null | undefined,
  min?: number,
  max?: number,
) => {
  if (min === undefined && max === undefined) {
    return true;
  }

  if (value === null || value === undefined) {
    return false;
  }

  return (
    (min === undefined || value >= min) && (max === undefined || value <= max)
  );
};

const lootMatchesParams = (
  loot: Loot,
  params: LootsControllerFetchLootsByGuildIdParams,
) => {
  if (params.world && loot.world !== params.world) {
    return false;
  }

  if (params.hid && !loot.items.some((item) => item.hid === params.hid)) {
    return false;
  }

  if (
    !includesAll(
      params.npcs,
      loot.npcs.map((npc) => npc.name),
    )
  ) {
    return false;
  }

  if (
    !includesAll(params.npcTypes, compact(loot.npcs.map((npc) => npc.type)))
  ) {
    return false;
  }

  if (
    !includesAll(
      params.players,
      loot.players.map((player) => player.name),
    )
  ) {
    return false;
  }

  if (
    !includesAll(
      params.rarities,
      compact(loot.items.map((item) => item.rarity)),
    )
  ) {
    return false;
  }

  if (
    !loot.items.some((item) => includesAll(params.professions, item.prof ?? []))
  ) {
    return false;
  }

  if (
    !includesAll(
      params.itemNames,
      loot.items.map((item) => item.name),
    )
  ) {
    return false;
  }

  if (
    !loot.npcs.some((npc) =>
      isInRange(npc.lvl, params.npcLevelMin, params.npcLevelMax),
    )
  ) {
    return false;
  }

  if (
    !loot.items.some((item) =>
      isInRange(item.lvl, params.itemLevelMin, params.itemLevelMax),
    )
  ) {
    return false;
  }

  if (
    !loot.players.some((player) =>
      isInRange(player.lvl, params.playerLevelMin, params.playerLevelMax),
    )
  ) {
    return false;
  }

  if (params.search) {
    const search = params.search.trim().toLowerCase();
    const searchableValues = [
      loot.location,
      ...loot.items.map((item) => item.name),
      ...loot.npcs.map((npc) => npc.name),
      ...loot.players.map((player) => player.name),
    ];

    if (
      !searchableValues.some((value) => value.toLowerCase().includes(search))
    ) {
      return false;
    }
  }

  return true;
};

const lootListQueryFilters = z.object({
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

const lootMatchesQueryKey = (loot: Loot, queryKey: QueryKey): boolean => {
  const params = lootListQueryFilters.safeParse(queryKey[1]);
  return params.success && lootMatchesParams(loot, params.data);
};

const upsertLootIntoInfiniteData = (
  data: LootsInfiniteData | undefined,
  loot: Loot,
) => {
  if (!data?.pages) {
    return data;
  }

  let found = false;
  const pages = data.pages.map((page) => {
    if (!page.some((pageLoot) => pageLoot.id === loot.id)) {
      return page;
    }

    found = true;
    return page.map((pageLoot) => (pageLoot.id === loot.id ? loot : pageLoot));
  });

  if (!found) {
    const [firstPage = [], ...restPages] = pages;
    return {
      ...data,
      pages: [[loot, ...firstPage], ...restPages],
    };
  }

  return {
    ...data,
    pages,
  };
};

const hasLootInInfiniteData = (
  data: LootsInfiniteData | undefined,
  lootId: number,
) =>
  data?.pages.some((page) => page.some((loot) => loot.id === lootId)) ?? false;

const updateLootShareInInfiniteData = (
  data: LootsInfiniteData | undefined,
  lootId: number,
  lootShare: LootShareResponseDto,
) => {
  if (!data?.pages) {
    return data;
  }

  let changed = false;
  const pages = data.pages.map((page) =>
    page.map((loot) => {
      if (loot.id !== lootId) {
        return loot;
      }

      changed = true;
      return { ...loot, lootShare };
    }),
  );

  return changed ? { ...data, pages } : data;
};

const useStableLootCollections = (pages: Loot[][] | undefined) => {
  const allLoots = pages?.flatMap((page) => page) ?? EMPTY_LOOTS;
  if (allLoots.length === 0) {
    return { allLoots, gridRows: EMPTY_GRID_ROWS };
  }

  const gridRows: Loot[][] = [];
  for (let index = 0; index < allLoots.length; index += GRID_COLUMNS) {
    gridRows.push(allLoots.slice(index, index + GRID_COLUMNS));
  }
  return { allLoots, gridRows };
};

export const useLiveLootList = () => {
  const { t } = useTranslation();
  const themedKey = useThemedKey();
  const guildId = useGuildId();
  const { world } = useGuildContext();
  const { socket, connected } = useGateway();
  const queryClient = useQueryClient();
  const { data: guilds } = useUsersControllerGetCurrentUserAccessibleGuilds();
  const { filters, hasActiveFilters, clearFilters } = useLootsFilters();
  const [newLootIds, setNewLootIds] = useState<Record<number, boolean>>({});
  const newLootTimeoutsRef = useRef<Record<number, number>>({});
  const clearNewLootTimeouts = () => {
    Object.values(newLootTimeoutsRef.current).forEach(window.clearTimeout);
    newLootTimeoutsRef.current = {};
  };
  const clearNewLootMarkers = () => {
    clearNewLootTimeouts();
    setNewLootIds({});
  };
  const currentGuildId = getCurrentGuildId(guilds, guildId);
  const lootQueryParams = getLootQueryParams(filters, world);
  const {
    data: loots,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: guildId
      ? getLootsControllerFetchLootsByGuildIdQueryKey(
          { guildId },
          lootQueryParams,
        )
      : ["loots", "missing-guild"],
    queryFn: ({ pageParam }) => {
      if (!guildId) {
        return Promise.resolve(EMPTY_LOOTS);
      }

      return lootsControllerFetchLootsByGuildId(
        { guildId },
        {
          ...lootQueryParams,
          cursor: pageParam > 0 ? pageParam : undefined,
        },
      );
    },
    getNextPageParam: (lastPage) =>
      lastPage.length === LOOTS_PAGE_LIMIT
        ? lastPage[lastPage.length - 1]?.id
        : undefined,
    initialPageParam: 0,
    enabled: !!guildId && !!world,
    staleTime: LOOTS_QUERY_STALE_TIME_MS,
    gcTime: LOOTS_QUERY_GC_TIME_MS,
  });
  const handleLootCreate = useEffectEvent(
    async (payload: GuildLootCreatedEventV2) => {
      if (!guildId || payload.guildId !== currentGuildId) {
        return;
      }

      let loot: Loot | null = null;
      try {
        loot = await lootsControllerFetchLootById({
          guildId,
          lootId: payload.lootId,
        });
      } catch {
        return;
      }

      if (!loot) {
        return;
      }

      let patchedAnyQuery = false;
      let insertedNewLoot = false;
      patchActiveLootLists(queryClient, guildId, (old, queryKey) => {
        if (!old?.pages || !lootMatchesQueryKey(loot, queryKey)) {
          return old;
        }

        patchedAnyQuery = true;
        if (!hasLootInInfiniteData(old, loot.id)) {
          insertedNewLoot = true;
        }
        return upsertLootIntoInfiniteData(old, loot);
      });

      queryClient.setQueriesData(
        {
          queryKey: getLootsControllerFetchLootByIdQueryKey({
            guildId,
            lootId: loot.id,
          }),
          exact: true,
        },
        loot,
      );

      if (!patchedAnyQuery) {
        void queryClient.invalidateQueries({
          queryKey: [`/guilds/${guildId}/loots`],
          exact: false,
        });
      }

      if (insertedNewLoot && document.visibilityState === "visible") {
        window.clearTimeout(newLootTimeoutsRef.current[loot.id]);
        setNewLootIds((prev) => ({
          ...prev,
          [loot.id]: true,
        }));
        newLootTimeoutsRef.current[loot.id] = window.setTimeout(() => {
          setNewLootIds((prev) => {
            if (!prev[loot.id]) {
              return prev;
            }

            const next = { ...prev };
            delete next[loot.id];
            return next;
          });
          delete newLootTimeoutsRef.current[loot.id];
        }, 1200);
      }
    },
  );
  const handleLootShareUpdate = useEffectEvent(
    (payload: GuildLootShareUpdatedEventV2) => {
      if (!guildId || payload.guildId !== currentGuildId) {
        return;
      }

      let patchedAnyListQuery = false;
      patchActiveLootLists(queryClient, guildId, (old) => {
        if (hasLootInInfiniteData(old, payload.lootId)) {
          patchedAnyListQuery = true;
        }
        return updateLootShareInInfiniteData(
          old,
          payload.lootId,
          payload.lootShare,
        );
      });

      let patchedDetailQuery = false;
      queryClient.setQueryData<Loot | null>(
        getLootsControllerFetchLootByIdQueryKey({
          guildId,
          lootId: payload.lootId,
        }),
        (old) => {
          if (!old) {
            return old;
          }

          patchedDetailQuery = true;
          return { ...old, lootShare: payload.lootShare };
        },
      );

      if (!patchedAnyListQuery) {
        void queryClient.invalidateQueries({
          queryKey: [`/guilds/${guildId}/loots`],
          exact: false,
        });
      }

      if (!patchedDetailQuery) {
        void queryClient.invalidateQueries({
          queryKey: getLootsControllerFetchLootByIdQueryKey({
            guildId,
            lootId: payload.lootId,
          }),
          exact: true,
        });
      }
    },
  );

  useEffect(() => {
    if (!connected || !guildId) {
      return;
    }

    const onLootCreate = (payload: GuildLootCreatedEventV2) => {
      void handleLootCreate(payload);
    };
    const onLootShareUpdate = (payload: GuildLootShareUpdatedEventV2) => {
      handleLootShareUpdate(payload);
    };

    socket.on(GatewayEvent.LOOTS_CREATE, onLootCreate);
    socket.on(GatewayEvent.LOOTS_SHARE_UPDATE, onLootShareUpdate);

    return () => {
      socket.off(GatewayEvent.LOOTS_CREATE, onLootCreate);
      socket.off(GatewayEvent.LOOTS_SHARE_UPDATE, onLootShareUpdate);
    };
  }, [connected, guildId, socket]);

  useEffect(
    () => () => {
      clearNewLootTimeouts();
    },
    [],
  );

  const scrollElementRef = useRef<HTMLDivElement>(null);
  const { viewMode } = useViewMode("loots-view-mode");
  const { allLoots, gridRows } = useStableLootCollections(getLootPages(loots));
  const totalCount = allLoots.length;

  const listVirtualizer = useVirtualizer({
    count: totalCount + 1,
    getScrollElement: () => scrollElementRef.current,
    estimateSize: () => 180,
    overscan: 5,
    useAnimationFrameWithResizeObserver: true,
    enabled: viewMode === "list",
  });

  const gridVirtualizer = useVirtualizer({
    count: gridRows.length + 1,
    getScrollElement: () => scrollElementRef.current,
    estimateSize: () => 220,
    overscan: 3,
    useAnimationFrameWithResizeObserver: true,
    enabled: viewMode === "grid",
  });

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible") {
        return;
      }

      clearNewLootMarkers();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const listVirtualItems = listVirtualizer.getVirtualItems();
  const gridVirtualItems = gridVirtualizer.getVirtualItems();
  const virtualizer = viewMode === "grid" ? gridVirtualizer : listVirtualizer;
  const virtualItems = virtualizer.getVirtualItems();

  useVirtualInfiniteScroll({
    enabled: viewMode === "list",
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    itemCount: totalCount,
    virtualItems: listVirtualItems,
  });
  useVirtualInfiniteScroll({
    enabled: viewMode === "grid",
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    itemCount: gridRows.length,
    virtualItems: gridVirtualItems,
  });
  useResetScrollTop({
    resetKey: guildId ?? "",
    scrollElementRef,
  });

  const hasLoots = hasInitialLoots(loots);

  return {
    scrollElementRef,
    isLoading,
    viewMode,
    gridVirtualizer,
    gridVirtualItems,
    gridRows,
    hasNextPage,
    t,
    themedKey,
    newLootIds,
    virtualizer,
    virtualItems,
    totalCount,
    allLoots,
    world,
    hasLoots,
    hasActiveFilters,
    clearFilters,
  };
};
