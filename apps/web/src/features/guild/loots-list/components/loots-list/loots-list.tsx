import { SharedTooltipProvider } from "@lootlog/ui/components/shared-tooltip-provider";
import { LootsListItem } from "@/features/guild/loots-list/components/loots-list/loots-list-item";
import { LootsListItemSkeleton } from "@/features/guild/loots-list/components/loots-list/loots-list-item-skeleton";
import { useGuildContext } from "@/hooks/context/use-guild-context";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { useViewMode } from "@/hooks/use-view-mode";
import { useLootsFilters } from "@/hooks/use-loots-filters";
import {
  useResetScrollTop,
  useVirtualInfiniteScroll,
} from "@/hooks/utils/use-virtual-infinite-scroll";
import type { Loot } from "@/lib/loots/loot-types";
import {
  getLootsControllerFetchLootsByGuildIdQueryKey,
  getLootsControllerFetchLootByIdQueryKey,
  lootsControllerFetchLootById,
  lootsControllerFetchLootsByGuildId,
} from "@lootlog/api-client/react-query/main/loots";
import { useUsersControllerGetCurrentUserAccessibleGuilds } from "@lootlog/api-client/react-query/main/users";
import type { LootShareResponseDto } from "@lootlog/api-client/models/main/loot-share-response-dto";
import type { LootsControllerFetchLootsByGuildIdParams } from "@lootlog/api-client/models/main/loots-controller-fetch-loots-by-guild-id-params";
import { GatewayEvent } from "@/config/gateway";
import { useGateway } from "@/hooks/utils/use-gateway";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { Button } from "@lootlog/ui/components/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@lootlog/ui/components/empty";
import {
  useInfiniteQuery,
  useQueryClient,
  type InfiniteData,
  type QueryKey,
} from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Globe2, PackageOpen, SearchX } from "lucide-react";
import { Spinner } from "@lootlog/ui/components/spinner";
import { useEffect, useEffectEvent, useRef, useState, type FC } from "react";
import { useTranslation } from "react-i18next";
import { ThemeEmptyStateIcon, useThemedKey } from "@/themes";
import { WorldSwitcher } from "@/components/common/world-switcher";

const LOOTS_PAGE_LIMIT = 20;
const LOOTS_QUERY_STALE_TIME_MS = 30_000;
const GRID_COLUMNS = 2;
const EMPTY_LOOTS: Loot[] = [];
const EMPTY_GRID_ROWS: Loot[][] = [];

type LootCreateGatewayPayload = {
  guildId: string;
  lootId: number;
};

type LootShareUpdateGatewayPayload = LootCreateGatewayPayload & {
  lootShare: LootShareResponseDto;
};

type LootsInfiniteData = InfiniteData<Loot[]>;
type LootFilters = ReturnType<typeof useLootsFilters>["filters"];

const parseOptionalNumber = (value: string) =>
  value.length > 0 ? Number(value) : undefined;

const optionalValues = <Value,>(values: Value[]) =>
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

const includesAll = <T,>(values: T[] | undefined, expected: T[]) => {
  if (!values?.length) {
    return true;
  }

  return expected.some((value) => values.includes(value));
};

const compact = <T,>(values: Array<T | null | undefined>) =>
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

const getLootQueryParamsFromKey = (
  queryKey: QueryKey,
): LootsControllerFetchLootsByGuildIdParams | null => {
  const params = queryKey[1];
  if (!params || typeof params !== "object" || Array.isArray(params)) {
    return null;
  }

  return params as LootsControllerFetchLootsByGuildIdParams;
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

export const LootsList: FC = () => {
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
        return Promise.resolve([] as Loot[]);
      }

      return lootsControllerFetchLootsByGuildId(
        { guildId },
        {
          ...lootQueryParams,
          cursor:
            typeof pageParam === "number" && pageParam > 0
              ? pageParam
              : undefined,
        },
      ) as Promise<Loot[]>;
    },
    getNextPageParam: (lastPage) =>
      lastPage.length === LOOTS_PAGE_LIMIT
        ? lastPage[lastPage.length - 1]?.id
        : undefined,
    initialPageParam: 0,
    enabled: !!guildId && !!world,
    staleTime: LOOTS_QUERY_STALE_TIME_MS,
  });
  const handleLootCreate = useEffectEvent(
    async (payload: LootCreateGatewayPayload) => {
      if (!guildId || payload.guildId !== currentGuildId) {
        return;
      }

      let loot: Loot | null = null;
      try {
        loot = (await lootsControllerFetchLootById({
          guildId,
          lootId: payload.lootId,
        })) as Loot | null;
      } catch {
        return;
      }

      if (!loot) {
        return;
      }

      const queryEntries = queryClient.getQueriesData<LootsInfiniteData>({
        queryKey: [`/guilds/${guildId}/loots`],
        exact: false,
      });

      let patchedAnyQuery = false;
      let insertedNewLoot = false;
      for (const [queryKey] of queryEntries) {
        const queryParams = getLootQueryParamsFromKey(queryKey);
        if (!queryParams || !lootMatchesParams(loot, queryParams)) {
          continue;
        }

        queryClient.setQueryData<LootsInfiniteData>(queryKey, (old) => {
          if (!old?.pages) {
            return old;
          }

          patchedAnyQuery = true;
          if (!hasLootInInfiniteData(old, loot.id)) {
            insertedNewLoot = true;
          }

          return upsertLootIntoInfiniteData(old, loot);
        });
      }

      queryClient.setQueryData(
        getLootsControllerFetchLootByIdQueryKey({
          guildId,
          lootId: loot.id,
        }),
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
    (payload: LootShareUpdateGatewayPayload) => {
      if (!guildId || payload.guildId !== currentGuildId) {
        return;
      }

      const queryEntries = queryClient.getQueriesData<LootsInfiniteData>({
        queryKey: [`/guilds/${guildId}/loots`],
        exact: false,
      });

      let patchedAnyListQuery = false;
      for (const [queryKey] of queryEntries) {
        queryClient.setQueryData<LootsInfiniteData>(queryKey, (old) => {
          if (hasLootInInfiniteData(old, payload.lootId)) {
            patchedAnyListQuery = true;
          }

          return updateLootShareInInfiniteData(
            old,
            payload.lootId,
            payload.lootShare,
          );
        });
      }

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

    const onLootCreate = (payload: LootCreateGatewayPayload) => {
      void handleLootCreate(payload);
    };
    const onLootShareUpdate = (payload: LootShareUpdateGatewayPayload) => {
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

  if (!world) {
    return (
      <div className="flex flex-1 items-start justify-center px-4 pb-8 pt-5 sm:px-6 md:items-center md:py-8">
        <section className="flex w-full max-w-sm flex-col items-center rounded-2xl border border-border bg-card px-4 py-5 text-center shadow-sm sm:px-7 sm:py-8">
          <div className="mb-4 flex size-14 items-center justify-center rounded-xl border border-border bg-background">
            <ThemeEmptyStateIcon
              className="size-8 text-muted-foreground"
              fallback={<Globe2 className="size-8 text-primary" />}
            />
          </div>
          <h2 className="text-base font-semibold text-foreground">
            {t("loots.list.selectWorldTitle")}
          </h2>
          <p className="mt-1 max-w-xs text-sm leading-5 text-muted-foreground">
            {t(themedKey("loots.list.noWorldSelected"))}
          </p>
          <div className="mt-5 w-full text-left">
            <WorldSwitcher
              width="w-full"
              triggerClassName="h-11 w-full justify-between px-3"
            />
          </div>
        </section>
      </div>
    );
  }

  if (!isLoading && !hasLoots) {
    return (
      <div className="flex flex-1 items-start justify-center px-3 pb-3 md:items-center">
        <Empty className="min-h-56 w-full max-w-xl">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              {hasActiveFilters ? (
                <SearchX />
              ) : (
                <ThemeEmptyStateIcon fallback={<PackageOpen />} />
              )}
            </EmptyMedia>
            <EmptyTitle>
              {hasActiveFilters
                ? t("loots.list.noResults")
                : t(themedKey("loots.list.empty"))}
            </EmptyTitle>
            <EmptyDescription>
              {t(
                hasActiveFilters
                  ? "loots.list.noResultsDescription"
                  : "loots.list.emptyDescription",
              )}
            </EmptyDescription>
          </EmptyHeader>
          {hasActiveFilters && (
            <EmptyContent>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={clearFilters}
              >
                {t("loots.list.clearFilters")}
              </Button>
            </EmptyContent>
          )}
        </Empty>
      </div>
    );
  }

  return (
    <SharedTooltipProvider>
      <ScrollArea
        id="loots-list"
        className="h-24 flex-1 relative"
        ref={scrollElementRef}
      >
        {isLoading ? (
          <div
            className={
              viewMode === "grid"
                ? "grid grid-cols-1 xl:grid-cols-2 gap-4 p-3 pt-0"
                : "flex flex-col gap-4 p-3 pt-0"
            }
          >
            {Array.from({ length: 8 }).map((_, index) => (
              <LootsListItemSkeleton key={index} index={index} />
            ))}
          </div>
        ) : viewMode === "grid" ? (
          <div
            className="p-3 pt-0"
            style={{
              height: `${gridVirtualizer.getTotalSize()}px`,
              width: "100%",
              position: "relative",
            }}
          >
            {gridVirtualItems.map((virtualRow) => {
              const isLoaderRow = virtualRow.index >= gridRows.length;
              const rowLoots = gridRows[virtualRow.index];

              return (
                <div
                  key={virtualRow.key}
                  data-index={virtualRow.index}
                  ref={gridVirtualizer.measureElement}
                  className="pb-3"
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 12,
                    right: 12,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  {isLoaderRow ? (
                    hasNextPage ? (
                      <div className="relative flex items-center justify-center gap-3 rounded-xl border border-border/50 bg-card/30  h-16">
                        <Spinner className="h-5 w-5 text-primary" />
                        <span className="text-sm text-muted-foreground font-medium">
                          {t(themedKey("loots.list.loadingMore"))}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center rounded-xl border border-border/50 bg-card/30  h-16">
                        <span className="text-xs text-muted-foreground">
                          {t(themedKey("loots.list.end"))}
                        </span>
                      </div>
                    )
                  ) : rowLoots ? (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 items-stretch">
                      {rowLoots.map((loot) => (
                        <div key={loot.id} className="h-full">
                          <LootsListItem
                            loot={loot}
                            isNew={newLootIds[loot.id]}
                          />
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : (
          <div
            className="p-4 pt-6"
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: "100%",
              position: "relative",
            }}
          >
            {virtualItems.map((virtualItem) => {
              const isLoaderRow = virtualItem.index > totalCount - 1;
              const loot = allLoots[virtualItem.index];

              return (
                <div
                  key={virtualItem.key}
                  data-index={virtualItem.index}
                  ref={virtualizer.measureElement}
                  className="pb-3"
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 12,
                    right: 12,
                    transform: `translateY(${virtualItem.start}px)`,
                  }}
                >
                  {isLoaderRow ? (
                    hasNextPage ? (
                      <div className="relative flex items-center justify-center gap-3 rounded-xl border border-border/50 bg-card/30  h-16">
                        <Spinner className="h-5 w-5 text-primary" />
                        <span className="text-sm text-muted-foreground font-medium">
                          {t(themedKey("loots.list.loadingMore"))}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center rounded-xl border border-border/50 bg-card/30  h-16">
                        <span className="text-xs text-muted-foreground">
                          {t(themedKey("loots.list.end"))}
                        </span>
                      </div>
                    )
                  ) : loot ? (
                    <LootsListItem loot={loot} isNew={newLootIds[loot.id]} />
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </SharedTooltipProvider>
  );
};
