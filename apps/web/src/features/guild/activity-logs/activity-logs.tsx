import { EmptyState } from "@/components/common/empty-state";
import { InfiniteListStatusRow } from "@/components/common/infinite-list-status-row";
import { FilterChipList } from "@/components/common/filter-chip-list";
import {
  LIST_TILE_INSET_CLASS,
  LIST_TILE_RULE_CLASS,
} from "@/components/common/list-tile";
import { TableRowsSkeleton } from "@/components/ui/table-rows-skeleton";
import {
  useResetScrollTop,
  useVirtualInfiniteScroll,
} from "@/hooks/utils/use-virtual-infinite-scroll";
import { useThemedKey } from "@/themes";
import { useMembersControllerGetGuildMemberReferences } from "@lootlog/client/main";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { cn } from "cn";
import {
  getVirtualListPadding,
  usePageVirtualizer,
} from "@/hooks/utils/use-page-scroll";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { useGuildWorld } from "@/hooks/context/use-guild-world";
import { GuildWorldHeaderSwitcher } from "@/components/layout/guild-world-header-switcher";
import { AlertCircle, SearchX } from "lucide-react";
import { useRef, useState } from "react";
import { useMediaQuery } from "usehooks-ts";
import { useTranslation } from "react-i18next";
import { activityLogsInfiniteQueryOptions } from "./activity-logs.queries";
import { ActivityLogsFilterToolbar } from "./components/activity-logs-filter-toolbar";
import { ActivityLogsMobileListSkeleton } from "./components/activity-logs-mobile-list-skeleton";
import { ActivityLogsTable } from "./components/activity-logs-table";
import { useActivityLogsFilterModel } from "./components/use-activity-logs-filter-model";
import { ACTIVITY_LOGS_TABLE_MEDIA_QUERY } from "./activity-logs-layout";

const ACTIVITY_LOGS_PAGE_LIMIT = 20;

export const ActivityLogs = () => {
  "use no memo"; // Reads a virtualizer that mutates in place; see usePageVirtualizer.

  const { t } = useTranslation();
  const themedKey = useThemedKey();
  const usesTable = useMediaQuery(ACTIVITY_LOGS_TABLE_MEDIA_QUERY);
  const listRef = useRef<HTMLDivElement>(null);
  // The table header pins right under the filter bar, whatever its height.
  const [stickyBarHeight, setStickyBarHeight] = useState(0);

  const observeStickyBar = (bar: HTMLDivElement | null) => {
    if (!bar) return;

    const measure = () =>
      setStickyBarHeight(bar.getBoundingClientRect().height);

    // Measured on mount, then again whenever filter chips change its height.
    const observer = new ResizeObserver(measure);

    measure();
    observer.observe(bar);

    return () => observer.disconnect();
  };

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
    listRef,
    estimateSize: () => (usesTable ? 56 : 88),
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
        <div className="p-3">
          <EmptyState
            framed
            icon={AlertCircle}
            title={t("common.activityLogs.loadError")}
          />
        </div>
      );
    }

    if (isLoading) {
      return usesTable ? (
        <TableRowsSkeleton
          rows={ACTIVITY_LOGS_PAGE_LIMIT}
          withHeader
          rowContent="text"
        />
      ) : (
        <ActivityLogsMobileListSkeleton rows={ACTIVITY_LOGS_PAGE_LIMIT} />
      );
    }

    if (activities.length === 0) {
      return (
        <div className="p-3">
          <EmptyState
            framed
            icon={SearchX}
            title={t(themedKey("common.activityLogs.empty"))}
          />
        </div>
      );
    }

    return (
      <>
        <ActivityLogsTable
          activities={activities}
          usesTable={usesTable}
          headerTop={stickyBarHeight}
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
    <div className="flex h-full min-h-0 flex-col">
      <h1 className="sr-only">{t("activityLogs.title")}</h1>
      <GuildWorldHeaderSwitcher />
      <ScrollArea
        data-under-top-bar
        ref={setScrollElement}
        className="min-h-0 flex-1"
      >
        {/* The filters and their chips stay on top while the log scrolls. */}
        <div
          ref={observeStickyBar}
          data-list-tile
          className="sticky top-(--page-sticky-top) z-20 backdrop-blur-sm"
        >
          <div
            role="group"
            aria-label={t("activityLogs.filters.title")}
            className={cn(
              "flex min-h-12 items-center py-2",
              LIST_TILE_RULE_CLASS,
              LIST_TILE_INSET_CLASS,
            )}
          >
            <ActivityLogsFilterToolbar model={filterModel} />
          </div>
          <FilterChipList
            chips={activeFilterChips}
            clearLabel={t("activityLogs.filters.clear")}
            onClear={filterModel.clearFilters}
            className={cn(
              "border-sidebar-border bg-transparent",
              LIST_TILE_INSET_CLASS,
            )}
          />
        </div>
        <div ref={listRef}>{renderResults()}</div>
      </ScrollArea>
    </div>
  );
};
