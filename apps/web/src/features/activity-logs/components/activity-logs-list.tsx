import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import {
  type ActivitySource,
  type ActivityType,
  useActivityLogs,
} from "@/hooks/api/activity-logs/use-activity-logs";
import { useActivityLogsFilters } from "@/hooks/use-activity-logs-filters";
import { ActivityLogsListItem } from "./activity-logs-list-item";
import { AlertCircle, Frown } from "lucide-react";
import { Spinner } from "@lootlog/ui/components/spinner";
import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useGuild } from "@/hooks/api/guilds/use-guild";
import {
  useResetScrollTop,
  useVirtualInfiniteScroll,
} from "@/hooks/utils/use-virtual-infinite-scroll";
import { useTranslation } from "react-i18next";

const ACTIVITY_LOGS_PAGE_LIMIT = 20;

export const ActivityLogsList = () => {
  const { t } = useTranslation();
  const { data: guild } = useGuild();
  const { filters } = useActivityLogsFilters();
  const scrollElementRef = useRef<HTMLDivElement>(null);

  const {
    data: activityLogs,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
  } = useActivityLogs({
    guildId: guild?.id,
    types:
      filters.types.length > 0 ? (filters.types as ActivityType[]) : undefined,
    sources:
      filters.sources.length > 0
        ? (filters.sources as ActivitySource[])
        : undefined,
    startDate: filters.startDate || undefined,
    endDate: filters.endDate || undefined,
    name: filters.name || undefined,
    world: filters.world || undefined,
    limit: ACTIVITY_LOGS_PAGE_LIMIT,
    clanName: filters.clanName || undefined,
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
  const activityLogsResetKey = JSON.stringify({
    filters,
    guildId: guild?.id ?? "",
  });

  useVirtualInfiniteScroll({
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    itemCount: totalCount,
    virtualItems,
  });
  useResetScrollTop({
    resetKey: activityLogsResetKey,
    scrollElementRef,
  });

  const hasActivities = allActivities.length > 0;

  if (error) {
    return (
      <div className="flex flex-col justify-center gap-4 items-center flex-1 text-muted-foreground">
        <AlertCircle size="48" className="text-destructive/70" />
        <span className="font-semibold text-foreground">
          {t("common.activityLogs.loadError")}
        </span>
      </div>
    );
  }

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
          {t("common.activityLogs.empty")}
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
                    <Spinner className="h-5 w-5 text-primary" />
                    <span className="text-sm text-muted-foreground font-medium">
                      {t("common.activityLogs.loadingMore")}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center rounded-xl border border-border/50 bg-card/30 backdrop-blur-md h-16">
                    <span className="text-xs text-muted-foreground">
                      {t("common.activityLogs.end")}
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
