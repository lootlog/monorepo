import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { useLoots } from "@/hooks/api/loots/use-loots";
import { Frown, Loader2 } from "lucide-react";
import { useRef, type FC } from "react";
import { LootsListItem } from "@/features/guild/components/loots-list/loots-list-item";
import { LootsListItemSkeleton } from "@/features/guild/components/loots-list/loots-list-item-skeleton";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useGuildContext } from "@/hooks/context/use-guild-context";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { useLootsViewMode } from "@/hooks/use-loots-view-mode";
import {
  useResetScrollTop,
  useVirtualInfiniteScroll,
} from "@/hooks/utils/use-virtual-infinite-scroll";
import { useTranslation } from "react-i18next";

const LOOTS_PAGE_LIMIT = 20;
const GRID_COLUMNS = 2;

export const LootsList: FC = () => {
  const { t } = useTranslation();
  const {
    data: loots,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useLoots({ limit: LOOTS_PAGE_LIMIT });

  const { world } = useGuildContext();
  const guildId = useGuildId();
  const scrollElementRef = useRef<HTMLDivElement>(null);
  const { viewMode } = useLootsViewMode();

  const allLoots = loots?.pages.flatMap((page) => page.data) ?? [];
  const totalCount = allLoots.length;
  const gridRows: (typeof allLoots)[] = [];
  for (let i = 0; i < allLoots.length; i += GRID_COLUMNS) {
    gridRows.push(allLoots.slice(i, i + GRID_COLUMNS));
  }

  const listVirtualizer = useVirtualizer({
    count: totalCount + 1,
    getScrollElement: () => scrollElementRef.current,
    estimateSize: () => 180,
    overscan: 5,
    useAnimationFrameWithResizeObserver: true,
    enabled: viewMode === "list",
  });

  const gridVirtualizer = useVirtualizer({
    count: gridRows.length + 1, // +1 for loader row
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

  const hasLoots = (loots?.pages?.[0]?.data?.length ?? 0) > 0;

  if (!world) {
    return (
      <div className="flex flex-col justify-center gap-8 items-center flex-1 text-muted-foreground">
        <Frown size="72" className="text-muted-foreground/50" />
        <span className="font-semibold text-foreground">
          {t("loots.list.noWorldSelected")}
        </span>
      </div>
    );
  }

  if (!isLoading && !hasLoots) {
    return (
      <div className="flex flex-col justify-center gap-8 items-center flex-1 text-muted-foreground">
        <Frown size="72" className="text-muted-foreground/50" />
        <span className="font-semibold text-foreground">
          {t("loots.list.empty")}
        </span>
      </div>
    );
  }

  return (
    <ScrollArea
      id="loots-list"
      className="h-24 flex-1 relative"
      ref={scrollElementRef}
    >
      <div className="h-3" />
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
          {gridVirtualizer.getVirtualItems().map((virtualRow) => {
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
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      <span className="text-sm text-muted-foreground font-medium">
                        {t("loots.list.loadingMore")}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center rounded-xl border border-border/50 bg-card/30 backdrop-blur-md h-16">
                      <span className="text-xs text-muted-foreground">
                        {t("loots.list.end")}
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
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      <span className="text-sm text-muted-foreground font-medium">
                        Ładowanie kolejnych lootów...
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center rounded-xl border border-border/50 bg-card/30 backdrop-blur-md h-16">
                      <span className="text-xs text-muted-foreground">
                        To już wszystkie looty
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
  );
};
