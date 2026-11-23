import { EmptyState } from "@lootlog/ui/components/empty-state";
import { LootsListItem } from "@/features/guild/loots-list/components/loots-list/loots-list-item";
import { LootsListSkeleton } from "@/features/guild/loots-list/components/loots-list/loots-list-skeleton";
import { InfiniteListStatusRow } from "@/components/common/infinite-list-status-row";
import {
  LOOTS_GRID_CELL_CLASS,
  LOOTS_GRID_CLASS,
} from "@/features/guild/loots-list/loots-list-layout";
import { cn } from "cn";
import { SharedTooltipProvider } from "@lootlog/ui/components/shared-tooltip-provider";

import { ThemeEmptyStateIcon } from "@/themes/adapters";
import { AnimatePresence } from "framer-motion";
import { EmptyMedia } from "@lootlog/ui/components/empty";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { AlertCircle, PackageOpen, SearchX } from "lucide-react";

import { useLiveLootList } from "./use-live-loot-list";
import { NewLootsPill } from "./new-loots-pill";
import { LootsListToolbar } from "./loots-list-toolbar";
import { LootListItemStacksProvider } from "./loot-list-item-stacks-provider";
import { RetryButton } from "@/components/common/retry-button";
import { ClearFiltersButton } from "@/components/common/clear-filters-button";

const REFRESHABLE_LIST_CLASS =
  "relative w-full transition-opacity duration-200 motion-reduce:transition-none";

const ARRIVAL_CLASS = "animate-arrival motion-reduce:animate-none";

export const LootsList = () => {
  "use no memo";

  const {
    setScrollElement,
    listRef,
    isEmpty,
    isError,
    isFailed,
    isPending,
    isRefreshing,
    retry,
    viewMode,
    gridVirtualizer,
    gridVirtualItems,
    gridRows,
    hasNextPage,
    t,
    themedKey,
    resumeReconciliation,
    newLootCount,
    showNewLoots,
    virtualizer,
    virtualItems,
    totalCount,
    allLoots,
    arrivedLootIds,
    world,
    hasActiveFilters,
    clearFilters,
    queryIdentity,
  } = useLiveLootList();

  const renderEmptyState = () => {
    if (isFailed) {
      return (
        <EmptyState
          fill
          icon={AlertCircle}
          title={t("loots.list.loadError")}
          description={t("loots.list.loadErrorDescription")}
          action={<RetryButton onRetry={retry} />}
        />
      );
    }

    if (hasActiveFilters) {
      return (
        <EmptyState
          fill
          icon={SearchX}
          title={t("loots.list.noResults")}
          description={t("loots.list.noResultsDescription")}
          action={<ClearFiltersButton onClear={clearFilters} />}
        />
      );
    }

    return (
      <EmptyState
        fill
        media={
          <EmptyMedia variant="icon">
            <ThemeEmptyStateIcon fallback=<PackageOpen /> />
          </EmptyMedia>
        }
        title={t(themedKey("loots.list.empty"))}
        description={t("loots.list.emptyDescription")}
      />
    );
  };

  const content = (
    <SharedTooltipProvider>
      <ScrollArea
        id="loots-list"
        data-under-top-bar
        className="min-h-0 flex-1"
        ref={setScrollElement}
        onScroll={resumeReconciliation}
      >
        <LootsListToolbar />
        <div
          aria-live="polite"
          className="pointer-events-none fixed inset-x-0 top-[calc(var(--page-sticky-top)+var(--filter-bar-height,0px)+0.5rem)] z-10 flex justify-center md:sticky md:inset-x-auto md:h-0"
        >
          <AnimatePresence initial={false}>
            {newLootCount > 0 && (
              <NewLootsPill count={newLootCount} onShow={showNewLoots} />
            )}
          </AnimatePresence>
        </div>
        <div ref={listRef}>
          {isFailed || isEmpty ? (
            <div className="p-3">{renderEmptyState()}</div>
          ) : isPending ? (
            <LootsListSkeleton viewMode={viewMode} />
          ) : viewMode === "grid" ? (
            <div
              aria-busy={isRefreshing}
              className={cn(
                REFRESHABLE_LIST_CLASS,
                isRefreshing && "opacity-60",
              )}
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
                    className="absolute inset-x-0 top-0"
                    style={{
                      transform: `translateY(${virtualRow.start - gridVirtualizer.options.scrollMargin}px)`,
                    }}
                  >
                    {isLoaderRow ? (
                      <InfiniteListStatusRow
                        hasNextPage={hasNextPage}
                        hasError={isError}
                        onRetry={retry}
                        loadingLabel={t(themedKey("loots.list.loadingMore"))}
                        endLabel={t(themedKey("loots.list.end"))}
                        errorLabel={t("loots.list.loadError")}
                      />
                    ) : rowLoots ? (
                      <div className={cn(LOOTS_GRID_CLASS, "items-stretch")}>
                        {rowLoots.map((loot) => (
                          <div
                            key={loot.id}
                            data-list-tile
                            className={cn(
                              LOOTS_GRID_CELL_CLASS,
                              arrivedLootIds.has(loot.id) && ARRIVAL_CLASS,
                            )}
                          >
                            <LootsListItem
                              loot={loot}
                              showWorld={world === null}
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
              aria-busy={isRefreshing}
              className={cn(
                REFRESHABLE_LIST_CLASS,
                isRefreshing && "opacity-60",
              )}
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
                    data-list-tile={isLoaderRow ? undefined : ""}
                    className={cn(
                      "absolute inset-x-0 top-0",
                      loot && arrivedLootIds.has(loot.id) && ARRIVAL_CLASS,
                    )}
                    style={{
                      transform: `translateY(${virtualItem.start - virtualizer.options.scrollMargin}px)`,
                    }}
                  >
                    {isLoaderRow ? (
                      <InfiniteListStatusRow
                        hasNextPage={hasNextPage}
                        hasError={isError}
                        onRetry={retry}
                        loadingLabel={t(themedKey("loots.list.loadingMore"))}
                        endLabel={t(themedKey("loots.list.end"))}
                        errorLabel={t("loots.list.loadError")}
                      />
                    ) : loot ? (
                      <LootsListItem loot={loot} showWorld={world === null} />
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div aria-hidden="true" className="h-20 md:hidden" />
      </ScrollArea>
    </SharedTooltipProvider>
  );

  return (
    <LootListItemStacksProvider key={queryIdentity} loots={allLoots}>
      {content}
    </LootListItemStacksProvider>
  );
};
