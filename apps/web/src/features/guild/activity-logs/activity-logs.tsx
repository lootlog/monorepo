import { EmptyState } from "@/components/common/empty-state";
import { InfiniteListStatusRow } from "@/components/common/infinite-list-status-row";
import { ResultsSurface } from "@/components/common/results-surface";
import { TableRowsSkeleton } from "@/components/ui/table-rows-skeleton";
import {
  useResetScrollTop,
  useVirtualInfiniteScroll,
} from "@/hooks/utils/use-virtual-infinite-scroll";
import { useThemedKey } from "@/themes";
import { useMembersControllerGetGuildMemberReferences } from "@lootlog/client/main";
import { useIsMobile } from "@lootlog/ui/hooks/use-mobile";
import {
  getVirtualListPadding,
  usePageVirtualizer,
} from "@/hooks/utils/use-page-scroll";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { useGuildWorld } from "@/hooks/context/use-guild-world";
import { GuildWorldHeaderSwitcher } from "@/components/layout/guild-world-header-switcher";
import { AlertCircle, SearchX } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { activityLogsInfiniteQueryOptions } from "./activity-logs.queries";
import { ActivityLogsFilterToolbar } from "./components/activity-logs-filter-toolbar";
import { ActivityLogsMobileListSkeleton } from "./components/activity-logs-mobile-list-skeleton";
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
  const { world } = useGuildWorld();

  const { filters, selectedTypes, selectedSources, activeFilterChips } =
    filterModel;

  const {
    data: activityLogs,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
    isFetchNextPageError,
  } = useInfiniteQuery(
    activityLogsInfiniteQueryOptions({
      guildId,
      types: selectedTypes,
      sources: selectedSources,
      startDate: filters.startDate,
      endDate: filters.endDate,
      name: filters.name,
      world: world ?? undefined,
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
    resetKey: JSON.stringify({ filters, guildId, world }),
  });

  const renderResults = () => {
    if (error && activities.length === 0) {
      return (
        <EmptyState
          icon={AlertCircle}
          title={t("common.activityLogs.loadError")}
        />
      );
    }

    if (isLoading) {
      return (
        <TableRowsSkeleton
          rows={ACTIVITY_LOGS_PAGE_LIMIT}
          withHeader
          rowContent="text"
          mobileList={
            <ActivityLogsMobileListSkeleton rows={ACTIVITY_LOGS_PAGE_LIMIT} />
          }
        />
      );
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
      <>
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
        <div className="p-3">
          <InfiniteListStatusRow
            hasNextPage={hasNextPage}
            hasError={isFetchNextPageError}
            onRetry={() => void fetchNextPage()}
            loadingLabel={t(themedKey("common.activityLogs.loadingMore"))}
            endLabel={t(themedKey("common.activityLogs.end"))}
            errorLabel={t("common.activityLogs.loadError")}
            retryLabel={t("common.actions.retry")}
          />
        </div>
      </>
    );
  };

  return (
    <div className="flex h-full min-h-0 flex-col p-3">
      <h1 className="sr-only">{t("activityLogs.title")}</h1>
      <GuildWorldHeaderSwitcher />
      <ResultsSurface
        chips={activeFilterChips}
        clearFiltersLabel={t("activityLogs.filters.clear")}
        onClearFilters={filterModel.clearFilters}
        scrollRef={setScrollElement}
        toolbar={<ActivityLogsFilterToolbar model={filterModel} />}
        toolbarLabel={t("activityLogs.filters.title")}
        withHorizontalScroll={!isMobile}
      >
        {renderResults()}
      </ResultsSurface>
    </div>
  );
};
