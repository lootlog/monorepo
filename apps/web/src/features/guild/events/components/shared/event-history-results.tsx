import { EmptyState } from "@/components/common/empty-state";
import { InfiniteListStatusRow } from "@/components/common/infinite-list-status-row";
import { useInfiniteScrollSentinel } from "@/hooks/utils/use-infinite-scroll-sentinel";
import { useResetScrollTop } from "@/hooks/utils/use-virtual-infinite-scroll";
import { CircleAlert, SearchX, Skull } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { RetryButton } from "@/components/common/retry-button";
import { ClearFiltersButton } from "@/components/common/clear-filters-button";

export type EventHistoryQuery = {
  isLoading: boolean;
  isError: boolean;
  isFetching: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  isFetchNextPageError: boolean;
  fetchNextPage: () => void;
  refetch: () => void;
};

type EventHistoryResultsProps = {
  scrollElement: HTMLDivElement | null;
  resetKey: string;
  isEmpty: boolean;
  query: EventHistoryQuery;
  onShowAllHeroes?: () => void;
  skeleton: ReactNode;
  children: ReactNode;
};

export const EventHistoryResults = ({
  scrollElement,
  resetKey,
  isEmpty,
  query,
  onShowAllHeroes,
  skeleton,
  children,
}: EventHistoryResultsProps) => {
  const { t } = useTranslation();
  const { hasNextPage, isError: hasError } = query;

  const onRetry = () => {
    if (query.isFetchNextPageError) {
      query.fetchNextPage();
    } else {
      query.refetch();
    }
  };

  useResetScrollTop({
    getScrollElement: () => scrollElement,
    resetKey,
  });

  const sentinelRef = useInfiniteScrollSentinel<HTMLDivElement>({
    enabled: !hasError,
    fetchNextPage: query.fetchNextPage,
    hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    scrollElement,
  });

  if (query.isLoading) {
    return (
      <div aria-busy="true" aria-label={t("events.kills.loading")}>
        {skeleton}
      </div>
    );
  }

  if (hasError && isEmpty) {
    return (
      <div className="p-3">
        <EmptyState
          fill
          icon={CircleAlert}
          title={t("events.error")}
          action={
            <RetryButton onRetry={onRetry} isRetrying={query.isFetching} />
          }
        />
      </div>
    );
  }

  if (isEmpty && !hasNextPage) {
    return (
      <div className="p-3">
        {onShowAllHeroes ? (
          <EmptyState
            fill
            icon={SearchX}
            title={t("events.kills.noHeroKills")}
            description={t("events.kills.noHeroKillsDescription")}
            action={
              <ClearFiltersButton
                onClear={onShowAllHeroes}
                label={t("events.kills.showAllHeroes")}
              />
            }
          />
        ) : (
          <EmptyState fill icon={Skull} title={t("events.kills.noKills")} />
        )}
      </div>
    );
  }

  return (
    <>
      {children}
      <div ref={sentinelRef}>
        <InfiniteListStatusRow
          hasNextPage={hasNextPage}
          hasError={hasError}
          onRetry={onRetry}
          loadingLabel={t("events.kills.loading")}
          endLabel={t("events.kills.endOfList")}
          errorLabel={t("events.error")}
        />
      </div>
    </>
  );
};
