import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import {
  type ActivitySource,
  type ActivityType,
  useActivityLogs,
} from "@/hooks/api/activity-logs/use-activity-logs";
import { useActivityLogsFilters } from "@/hooks/use-activity-logs-filters";
import { ActivityLogsListItem } from "./activity-logs-list-item";
import { Frown, Loader2 } from "lucide-react";
import { useEffect, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useGuild } from "@/hooks/api/guilds/use-guild";

const ACTIVITY_LOGS_PAGE_LIMIT = 20;

export const ActivityLogsList = () => {
  const { data: guild } = useGuild();
  const { filters } = useActivityLogsFilters();
  const scrollElementRef = useRef<HTMLDivElement>(null);

  const {
    data: activityLogs,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useActivityLogs({
    guildId: guild?.id,
    types: filters.types.length > 0 ? (filters.types as ActivityType[]) : undefined,
    sources: filters.sources.length > 0 ? (filters.sources as ActivitySource[]) : undefined,
    startDate: filters.startDate || undefined,
    endDate: filters.endDate || undefined,
    name: filters.name || undefined,
    world: filters.world || undefined,
    limit: ACTIVITY_LOGS_PAGE_LIMIT,
  });

  const allActivities =
    activityLogs?.pages.flatMap((page) => page.data.data) ?? [];
  const totalCount = allActivities.length;

  const virtualizer = useVirtualizer({
    count: totalCount + 1,
    getScrollElement: () => scrollElementRef.current,
    estimateSize: () => 140,
    overscan: 5,
    useAnimationFrameWithResizeObserver: true,
  });

  const virtualItems = virtualizer.getVirtualItems();

  useEffect(() => {
    const [lastItem] = [...virtualItems].reverse();

    if (!lastItem) return;

    if (
      lastItem.index >= totalCount - 1 &&
      hasNextPage &&
      !isFetchingNextPage
    ) {
      fetchNextPage();
    }
  }, [
    hasNextPage,
    fetchNextPage,
    totalCount,
    isFetchingNextPage,
    virtualItems,
  ]);

  useEffect(() => {
    scrollElementRef.current?.scrollTo(0, 0);
  }, [guild?.id, filters]);

  const hasActivities = allActivities.length > 0;

  if (isLoading) {
    return (
      <ScrollArea className="h-24 flex-1 relative" ref={scrollElementRef}>
        <div className="flex flex-col gap-4 p-3">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="flex items-start gap-4">
              <Skeleton className="h-12 w-12 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    );
  }

  if (!hasActivities) {
    return (
      <div className="flex flex-col justify-center gap-8 items-center flex-1 text-muted-foreground">
        <Frown size="72" className="text-muted-foreground/50" />
        <span className="font-semibold text-foreground">
          Nie znaleziono żadnych aktywności.
        </span>
      </div>
    );
  }

  return (
    <ScrollArea
      id="activity-logs-list"
      className="h-24 flex-1 relative"
      ref={scrollElementRef}
    >
      <div className="h-3" />
      <div
        className="p-3 pt-0"
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {virtualItems.map((virtualItem) => {
          const isLoaderRow = virtualItem.index > totalCount - 1;
          const activity = allActivities[virtualItem.index];

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
                      Ładowanie kolejnych aktywności...
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center rounded-xl border border-border/50 bg-card/30 backdrop-blur-md h-16">
                    <span className="text-xs text-muted-foreground">
                      To już wszystkie aktywności
                    </span>
                  </div>
                )
              ) : activity ? (
                <ActivityLogsListItem activity={activity} />
              ) : null}
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
};
