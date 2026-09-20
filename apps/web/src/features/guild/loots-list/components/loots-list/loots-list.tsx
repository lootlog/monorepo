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
import { CircleAlert, PackageOpen, SearchX } from "lucide-react";

import { useLiveLootList } from "./use-live-loot-list";

// The empty states share the world-selection card: a fixed-size card near
// the top instead of a panel stretched over the whole list.
const EMPTY_STATE_WRAPPER_CLASS =
  "flex min-h-0 flex-1 items-start justify-center overflow-y-auto px-4 pb-8 pt-5 sm:px-6 md:[align-items:safe_center] md:py-8";

const EMPTY_STATE_CLASS = "w-full max-w-sm flex-none bg-card";

// Dimming the current page signals a reload without moving anything.
const REFRESHABLE_LIST_CLASS =
  "relative w-full transition-opacity duration-200 motion-reduce:transition-none";

export const LootsList = () => {
  const {
    scrollElementRef,
    isEmpty,
    isError,
    isPending,
    isRefreshing,
    refetch,
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

  if (isError) {
    return (
      <div className={EMPTY_STATE_WRAPPER_CLASS}>
        <Empty className={EMPTY_STATE_CLASS}>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CircleAlert />
            </EmptyMedia>
            <EmptyTitle>{t("loots.list.loadError")}</EmptyTitle>
            <EmptyDescription>
              {t("loots.list.loadErrorDescription")}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void refetch()}
            >
              {t("common.actions.retry")}
            </Button>
          </EmptyContent>
        </Empty>
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className={EMPTY_STATE_WRAPPER_CLASS}>
        <Empty className={EMPTY_STATE_CLASS}>
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
