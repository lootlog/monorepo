import { EmptyState } from "@/components/common/empty-state";
import { ResultsSurface } from "@/components/common/results-surface";
import { TableRowsSkeleton } from "@/components/ui/table-rows-skeleton";
import {
  useResetScrollTop,
  useVirtualInfiniteScroll,
} from "@/hooks/utils/use-virtual-infinite-scroll";
import { useThemedKey } from "@/themes";
import { useMembersControllerGetGuildMemberReferences } from "@lootlog/client/main";
import { Spinner } from "@lootlog/ui/components/spinner";
import { useIsMobile } from "@lootlog/ui/hooks/use-mobile";
import {
  getVirtualListPadding,
  usePageVirtualizer,
} from "@/hooks/utils/use-page-scroll";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { AlertCircle, SearchX } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { activityLogsInfiniteQueryOptions } from "./activity-logs.queries";
import { ActivityLogsFilterToolbar } from "./components/activity-logs-filter-toolbar";
import { ActivityLogsTable } from "./components/activity-logs-table";
import { useActivityLogsFilterModel } from "./components/use-activity-logs-filter-model";

const ACTIVITY_LOGS_PAGE_LIMIT = 20;

export const ActivityLogs = () => {
  "use no memo"; // Reads a virtualizer that mutates in place; see usePageVirtualizer.

  const { t } = useTranslation();
  const themedKey = useThemedKey();
  const isMobile = useIsMobile();

  const [scrollElement, setScrollElement] = useState<HTMLDivElement | null>(
    null,
  );

  const { guildId } = useParams({
    from: "/_authenticated/$guildId/activity-logs",
  });

  const filterModel = useActivityLogsFilterModel();

  const { filters, selectedTypes, selectedSources, activeFilterChips } =
    filterModel;

  const {
    data: activityLogs,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
  } = useInfiniteQuery(
    activityLogsInfiniteQueryOptions({
      guildId,
      types: selectedTypes,
      sources: selectedSources,
      startDate: filters.startDate,
      endDate: filters.endDate,
      name: filters.name,
      world: filters.world,
      clanName: filters.clanName,
      limit: ACTIVITY_LOGS_PAGE_LIMIT,
    }),
  );

  const { data: members } = useMembersControllerGetGuildMemberReferences(
    { guildId },
    { includeInactive: true },
  );

  const memberNameByDiscordId = new Map(
    members?.map((member) => [member.userId, member.name]),
  );

  const activities = activityLogs?.pages.flatMap((page) => page.data) ?? [];

  const virtualizer = usePageVirtualizer<HTMLElement>({
    count: activities.length,
    scrollElement,
    estimateSize: () => (isMobile ? 88 : 56),
    overscan: 8,
  });

  const virtualRows = virtualizer.getVirtualItems();

  useVirtualInfiniteScroll({
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    itemCount: activities.length,
    virtualItems: virtualRows,
  });
  useResetScrollTop({
    getScrollElement: () => scrollElement,
    resetKey: JSON.stringify({ filters, guildId }),
  });

  const renderResults = () => {
    if (error) {
      return (
        <EmptyState
          icon={AlertCircle}
          title={t("common.activityLogs.loadError")}
        />
      );
    }

    if (isLoading) {
      return <TableRowsSkeleton rows={ACTIVITY_LOGS_PAGE_LIMIT} />;
    }

    if (activities.length === 0) {
      return (
        <EmptyState
          icon={SearchX}
          title={t(themedKey("common.activityLogs.empty"))}
        />
      );
    }

    return (
      <ActivityLogsTable
        activities={activities}
        isMobile={isMobile}
        memberNameByDiscordId={memberNameByDiscordId}
        virtualRows={virtualRows}
        padding={getVirtualListPadding(
          virtualRows,
          virtualizer.getTotalSize(),
          virtualizer.options.scrollMargin,
        )}
      />
    );
  };

  return (
    <div className="flex h-full min-h-0 flex-col p-3">
      <h1 className="sr-only">{t("activityLogs.title")}</h1>
      <ResultsSurface
        chips={activeFilterChips}
        clearFiltersLabel={t("activityLogs.filters.clear")}
        onClearFilters={filterModel.clearFilters}
        scrollRef={setScrollElement}
        toolbar={<ActivityLogsFilterToolbar model={filterModel} />}
        toolbarLabel={t("activityLogs.filters.title")}
        withHorizontalScroll={!isMobile}
        footer={
          <div
            aria-live="polite"
            className="flex h-14 shrink-0 items-center justify-between gap-3 border-t border-border px-4 text-sm text-muted-foreground"
          >
            <span className="whitespace-nowrap">
              {t("activityLogs.table.loaded", { count: activities.length })}
            </span>
            {isFetchingNextPage ? (
              <span className="flex min-w-0 items-center gap-2">
                <Spinner className="size-4" />
                <span className="truncate">
                  {t(themedKey("common.activityLogs.loadingMore"))}
                </span>
              </span>
            ) : (
              !hasNextPage &&
              activities.length > 0 && (
                <span className="truncate">
                  {t(themedKey("common.activityLogs.end"))}
                </span>
              )
            )}
          </div>
        }
      >
        {renderResults()}
      </ResultsSurface>
    </div>
  );
};
