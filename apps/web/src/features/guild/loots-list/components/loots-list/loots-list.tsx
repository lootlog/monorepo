import { WorldSelectionEmptyState } from "@/components/common/world-selection-empty-state";
import { LootsListItem } from "@/features/guild/loots-list/components/loots-list/loots-list-item";
import { LootsListSkeleton } from "@/features/guild/loots-list/components/loots-list/loots-list-skeleton";
import { LootListSentinelRow } from "@/features/guild/loots-list/components/loots-list/loot-list-sentinel-row";
import {
  LOOTS_GRID_CLASS,
  LOOTS_LIST_INSET_CLASS,
  LOOTS_LIST_ROW_GAP_CLASS,
} from "@/features/guild/loots-list/loots-list-layout";
import { cn } from "cn";
import { SharedTooltipProvider } from "@lootlog/ui/components/shared-tooltip-provider";

import { ThemeEmptyStateIcon } from "@/themes";
import { Button } from "@lootlog/ui/components/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@lootlog/ui/components/empty";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { PackageOpen, SearchX } from "lucide-react";

import { useLiveLootList } from "./use-live-loot-list";

// Dimming the current page signals a reload without moving anything.
const REFRESHABLE_LIST_CLASS =
  "relative w-full transition-opacity duration-200 motion-reduce:transition-none";

export const LootsList = () => {
  const {
    scrollElementRef,
    isLoading,
    isRefreshing,
    viewMode,
    gridVirtualizer,
    gridVirtualItems,
    gridRows,
    hasNextPage,
    t,
    themedKey,
    resumeReconciliation,
    virtualizer,
    virtualItems,
    totalCount,
    allLoots,
    world,
    hasLoots,
    hasActiveFilters,
    clearFilters,
  } = useLiveLootList();

  if (!world) {
    return (
      <WorldSelectionEmptyState
        title={t("loots.list.selectWorldTitle")}
        description={t(themedKey("loots.list.noWorldSelected"))}
      />
    );
  }

  if (!isLoading && !hasLoots) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto px-3 pb-3">
        <Empty className="min-h-56 w-full max-w-xl">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              {hasActiveFilters ? (
                <SearchX />
              ) : (
                <ThemeEmptyStateIcon fallback=<PackageOpen /> />
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
        onScroll={resumeReconciliation}
      >
        {isLoading ? (
          <LootsListSkeleton viewMode={viewMode} />
        ) : viewMode === "grid" ? (
          <div
            aria-busy={isRefreshing}
            className={cn(REFRESHABLE_LIST_CLASS, isRefreshing && "opacity-60")}
            style={{ height: `${gridVirtualizer.getTotalSize()}px` }}
          >
            {gridVirtualItems.map((virtualRow) => {
              const isLoaderRow = virtualRow.index >= gridRows.length;
              const rowLoots = gridRows[virtualRow.index];

              return (
                <div
                  key={virtualRow.key}
                  data-index={virtualRow.index}
                  ref={gridVirtualizer.measureElement}
                  className={cn(
                    "absolute top-0",
                    LOOTS_LIST_INSET_CLASS,
                    LOOTS_LIST_ROW_GAP_CLASS,
                  )}
                  style={{ transform: `translateY(${virtualRow.start}px)` }}
                >
                  {isLoaderRow ? (
                    <LootListSentinelRow
                      hasNextPage={hasNextPage}
                      loadingLabel={t(themedKey("loots.list.loadingMore"))}
                      endLabel={t(themedKey("loots.list.end"))}
                    />
                  ) : rowLoots ? (
                    <div className={cn(LOOTS_GRID_CLASS, "items-stretch")}>
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
            aria-busy={isRefreshing}
            className={cn(REFRESHABLE_LIST_CLASS, isRefreshing && "opacity-60")}
            style={{ height: `${virtualizer.getTotalSize()}px` }}
          >
            {virtualItems.map((virtualItem) => {
              const isLoaderRow = virtualItem.index > totalCount - 1;
              const loot = allLoots[virtualItem.index];

              return (
                <div
                  key={virtualItem.key}
                  data-index={virtualItem.index}
                  ref={virtualizer.measureElement}
                  className={cn(
                    "absolute top-0",
                    LOOTS_LIST_INSET_CLASS,
                    LOOTS_LIST_ROW_GAP_CLASS,
                  )}
                  style={{ transform: `translateY(${virtualItem.start}px)` }}
                >
                  {isLoaderRow ? (
                    <LootListSentinelRow
                      hasNextPage={hasNextPage}
                      loadingLabel={t(themedKey("loots.list.loadingMore"))}
                      endLabel={t(themedKey("loots.list.end"))}
                    />
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
