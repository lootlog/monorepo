import { EmptyState } from "@/components/common/empty-state";
import { WorldSelectionEmptyState } from "@/components/common/world-selection-empty-state";
import { LootsListItem } from "@/features/guild/loots-list/components/loots-list/loots-list-item";
import { LootsListSkeleton } from "@/features/guild/loots-list/components/loots-list/loots-list-skeleton";
import { InfiniteListStatusRow } from "@/components/common/infinite-list-status-row";
import {
  LOOTS_GRID_CLASS,
  LOOTS_LIST_INSET_CLASS,
  LOOTS_LIST_ROW_GAP_CLASS,
} from "@/features/guild/loots-list/loots-list-layout";
import { cn } from "cn";
import { SharedTooltipProvider } from "@lootlog/ui/components/shared-tooltip-provider";

import { ThemeEmptyStateIcon } from "@/themes";
import { Button } from "@lootlog/ui/components/button";
import { EmptyMedia } from "@lootlog/ui/components/empty";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import {
  ArrowUp,
  CircleAlert,
  PackageOpen,
  RotateCcw,
  SearchX,
} from "lucide-react";

import { useLiveLootList } from "./use-live-loot-list";
import { LootListItemStacksProvider } from "./loot-list-item-stacks-provider";

// Dimming the current page signals a reload without moving anything.
const REFRESHABLE_LIST_CLASS =
  "relative w-full transition-opacity duration-200 motion-reduce:transition-none";

export const LootsList = () => {
  "use no memo"; // Reads a virtualizer that mutates in place; see usePageVirtualizer.

  const {
    setScrollElement,
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
    world,
    hasActiveFilters,
    clearFilters,
    queryIdentity,
  } = useLiveLootList();

  if (!world) {
    return (
      <WorldSelectionEmptyState
        title={t("loots.list.selectWorldTitle")}
        description={t(themedKey("loots.list.noWorldSelected"))}
      />
    );
  }

  if (isFailed) {
    return (
      <div className="px-3 pb-3">
        <EmptyState
          framed
          icon={CircleAlert}
          title={t("loots.list.loadError")}
          description={t("loots.list.loadErrorDescription")}
          action={
            <Button
              type="button"
              variant="outline"
              icon=<RotateCcw className="size-3.5" />
              onClick={retry}
            >
              {t("common.actions.retry")}
            </Button>
          }
        />
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="px-3 pb-3">
        {hasActiveFilters ? (
          <EmptyState
            framed
            icon={SearchX}
            title={t("loots.list.noResults")}
            description={t("loots.list.noResultsDescription")}
            action={
              <Button type="button" variant="outline" onClick={clearFilters}>
                {t("loots.list.clearFilters")}
              </Button>
            }
          />
        ) : (
          <EmptyState
            framed
            media={
              <EmptyMedia variant="icon">
                <ThemeEmptyStateIcon fallback=<PackageOpen /> />
              </EmptyMedia>
            }
            title={t(themedKey("loots.list.empty"))}
            description={t("loots.list.emptyDescription")}
          />
        )}
      </div>
    );
  }

  const content = (
    <SharedTooltipProvider>
      <ScrollArea
        id="loots-list"
        className="h-24 flex-1 relative"
        ref={setScrollElement}
        onScroll={resumeReconciliation}
      >
        {/* Phones scroll the document under the app bar; wider screens scroll this viewport. */}
        <div
          aria-live="polite"
          className="pointer-events-none fixed inset-x-0 top-16 z-10 flex justify-center md:sticky md:inset-x-auto md:top-2 md:h-0"
        >
          {newLootCount > 0 && (
            <Button
              type="button"
              size="sm"
              className="pointer-events-auto"
              onClick={showNewLoots}
            >
              <ArrowUp className="size-4" aria-hidden />
              {t("loots.list.newLoots", { count: newLootCount })}
            </Button>
          )}
        </div>
        {isPending ? (
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
                      retryLabel={t("common.actions.retry")}
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
                      retryLabel={t("common.actions.retry")}
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

  return (
    <LootListItemStacksProvider key={queryIdentity} loots={allLoots}>
      {content}
    </LootListItemStacksProvider>
  );
};
