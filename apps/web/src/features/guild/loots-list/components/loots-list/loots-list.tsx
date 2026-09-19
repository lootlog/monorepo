import { NoticeCard } from "@/components/common/notice-card";
import { LootsListItem } from "@/features/guild/loots-list/components/loots-list/loots-list-item";
import { LootsListItemSkeleton } from "@/features/guild/loots-list/components/loots-list/loots-list-item-skeleton";
import { SharedTooltipProvider } from "@lootlog/ui/components/shared-tooltip-provider";

import { WorldSwitcher } from "@/components/common/world-switcher";
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
import { Spinner } from "@lootlog/ui/components/spinner";
import { Globe2, PackageOpen, SearchX } from "lucide-react";

import { useLiveLootList } from "./use-live-loot-list";

export const LootsList = () => {
  const {
    scrollElementRef,
    isLoading,
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
      <NoticeCard
        icon={
          <ThemeEmptyStateIcon
            className="size-8 text-muted-foreground"
            fallback=<Globe2 className="size-8 text-primary" />
          />
        }
        title={t("loots.list.selectWorldTitle")}
        description={t(themedKey("loots.list.noWorldSelected"))}
      >
        <div className="text-left">
          <WorldSwitcher
            width="w-full"
            triggerClassName="h-11 w-full justify-between px-3"
          />
        </div>
      </NoticeCard>
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
