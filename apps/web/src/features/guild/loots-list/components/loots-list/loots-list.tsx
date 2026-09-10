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
    newLootIds,
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
      <div className="flex min-h-0 flex-1 items-start justify-center overflow-y-auto px-4 pb-8 pt-5 sm:px-6 md:[align-items:safe_center] md:py-8">
        <section className="flex w-full max-w-sm flex-col items-center rounded-2xl border border-border bg-card px-4 py-5 text-center shadow-sm sm:px-7 sm:py-8">
          <div className="mb-4 flex size-14 items-center justify-center rounded-xl border border-border bg-background">
            <ThemeEmptyStateIcon
              className="size-8 text-muted-foreground"
              fallback=<Globe2 className="size-8 text-primary" />
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
      <div className="flex min-h-0 flex-1 items-start justify-center overflow-y-auto px-3 pb-3 md:[align-items:safe_center]">
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
