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
  lootsControllerFetchLootsByGuildId,
} from "@/lib/api/generated/main/loots/loots";
import type { LootsControllerFetchLootsByGuildIdParams } from "@/lib/api/generated/main/model";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Frown } from "lucide-react";
import { Spinner } from "@lootlog/ui/components/spinner";
import { useRef, type FC } from "react";
import { useTranslation } from "react-i18next";
import { ThemeEmptyStateIcon, useThemedKey } from "@/themes";

const LOOTS_PAGE_LIMIT = 20;
const GRID_COLUMNS = 2;
const EMPTY_LOOTS: Loot[] = [];
const EMPTY_GRID_ROWS: Loot[][] = [];

const parseOptionalNumber = (value: string) =>
  value.length > 0 ? Number(value) : undefined;

const useStableLootCollections = (pages: Loot[][] | undefined) => {
  const collectionsRef = useRef<{
    pages: Loot[][] | undefined;
    allLoots: Loot[];
    gridRows: Loot[][];
  }>({
    pages: undefined,
    allLoots: EMPTY_LOOTS,
    gridRows: EMPTY_GRID_ROWS,
  });

  if (collectionsRef.current.pages !== pages) {
    const allLoots = pages?.flatMap((page) => page) ?? EMPTY_LOOTS;
    const gridRows: Loot[][] = [];

    for (let index = 0; index < allLoots.length; index += GRID_COLUMNS) {
      gridRows.push(allLoots.slice(index, index + GRID_COLUMNS));
    }

    collectionsRef.current = {
      pages,
      allLoots,
      gridRows,
    };
  }

  return collectionsRef.current;
};

export const LootsList: FC = () => {
  const { t } = useTranslation();
  const themedKey = useThemedKey();
  const guildId = useGuildId();
  const { world } = useGuildContext();
  const { filters } = useLootsFilters();
  const lootQueryParams: LootsControllerFetchLootsByGuildIdParams = {
    limit: LOOTS_PAGE_LIMIT,
    npcs: filters.npcs.length > 0 ? filters.npcs : undefined,
    npcTypes: filters.npcTypes.length > 0 ? filters.npcTypes : undefined,
    rarities: filters.rarities.length > 0 ? filters.rarities : undefined,
    players: filters.players.length > 0 ? filters.players : undefined,
    npcLevelMin: parseOptionalNumber(filters.npcLevelMin),
    npcLevelMax: parseOptionalNumber(filters.npcLevelMax),
    itemLevelMin: parseOptionalNumber(filters.itemLevelMin),
    itemLevelMax: parseOptionalNumber(filters.itemLevelMax),
    playerLevelMin: parseOptionalNumber(filters.playerLevelMin),
    playerLevelMax: parseOptionalNumber(filters.playerLevelMax),
    search: filters.search || undefined,
    hid: filters.hid || undefined,
    itemNames: filters.itemNames.length > 0 ? filters.itemNames : undefined,
    world: world || undefined,
  };
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
    refetchOnMount: "always",
    staleTime: 0,
  });

  const scrollElementRef = useRef<HTMLDivElement>(null);
  const { viewMode } = useViewMode("loots-view-mode");
  const { allLoots, gridRows } = useStableLootCollections(loots?.pages);
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

  const hasLoots = (loots?.pages?.[0]?.length ?? 0) > 0;

  if (!world) {
    return (
      <div className="flex flex-col justify-center gap-8 items-center flex-1 text-muted-foreground">
        <ThemeEmptyStateIcon
          className="w-[72px] h-[72px] text-muted-foreground/50"
          fallback={<Frown size="72" className="text-muted-foreground/50" />}
        />
        <span className="font-semibold text-foreground">
          {t(themedKey("loots.list.noWorldSelected"))}
        </span>
      </div>
    );
  }

  if (!isLoading && !hasLoots) {
    return (
      <div className="flex flex-col justify-center gap-8 items-center flex-1 text-muted-foreground">
        <ThemeEmptyStateIcon
          className="w-[72px] h-[72px] text-muted-foreground/50"
          fallback={<Frown size="72" className="text-muted-foreground/50" />}
        />
        <span className="font-semibold text-foreground">
          {t(themedKey("loots.list.empty"))}
        </span>
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
                      <div className="relative flex items-center justify-center gap-3 rounded-xl border border-border/50 bg-card/30 backdrop-blur-md h-16">
                        <Spinner className="h-5 w-5 text-primary" />
                        <span className="text-sm text-muted-foreground font-medium">
                          {t(themedKey("loots.list.loadingMore"))}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center rounded-xl border border-border/50 bg-card/30 backdrop-blur-md h-16">
                        <span className="text-xs text-muted-foreground">
                          {t(themedKey("loots.list.end"))}
                        </span>
                      </div>
                    )
                  ) : rowLoots ? (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 items-stretch">
                      {rowLoots.map((loot) => (
                        <div key={loot.id} className="h-full">
                          <LootsListItem loot={loot} />
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
                      <div className="relative flex items-center justify-center gap-3 rounded-xl border border-border/50 bg-card/30 backdrop-blur-md h-16">
                        <Spinner className="h-5 w-5 text-primary" />
                        <span className="text-sm text-muted-foreground font-medium">
                          {t(themedKey("loots.list.loadingMore"))}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center rounded-xl border border-border/50 bg-card/30 backdrop-blur-md h-16">
                        <span className="text-xs text-muted-foreground">
                          {t(themedKey("loots.list.end"))}
                        </span>
                      </div>
                    )
                  ) : loot ? (
                    <LootsListItem loot={loot} />
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
