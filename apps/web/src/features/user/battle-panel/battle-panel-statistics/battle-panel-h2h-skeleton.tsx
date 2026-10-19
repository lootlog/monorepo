import { CardListSkeleton } from "@/components/common/card-list-skeleton";
import { DetailSkeleton } from "@/components/common/detail-skeleton";
import { ResultsSurface } from "@/components/common/results-surface";
import { SkeletonLine } from "@/components/common/skeleton-line";
import { TablePaginationFooterSkeleton } from "@/components/ui/table-pagination-footer-skeleton";
import { TableRowsSkeleton } from "@/components/ui/table-rows-skeleton";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { InlineSearchFieldSkeleton } from "@/components/common/inline-search-field-skeleton";
import { RESULTS_TABLE_MEDIA_QUERY } from "@/components/common/page-sticky-table-header";
import { useMediaQuery } from "usehooks-ts";
import { StatisticsFilterToolbarSkeleton } from "./components/statistics-filter-toolbar-skeleton";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { HeadToHeadPageVariantProps } from "./use-head-to-head-page";

type BattlePanelH2hSkeletonProps = {
  /** One placeholder of the card the route lists below `md` instead of its table. */
  mobileCard: ReactNode;
} & (
  | ({
      /** `HeadToHeadPageVariant`: static titles. */
      variant: "head-to-head";
    } & Pick<HeadToHeadPageVariantProps, "titleKey">)
  | {
      /** `PlayerVsPlayerFullPage`: named by the loaded characters, with no default chips. */
      variant: "player-vs-player";
    }
);

// Stands in for the head-to-head pages: a `ResultsSurface` whose filter bar
// carries the opponent search and, on wide pages, the filter toolbar.
export const BattlePanelH2hSkeleton = (props: BattlePanelH2hSkeletonProps) => {
  const { t } = useTranslation();
  const isHeadToHead = props.variant === "head-to-head";
  const listsFilters = useMediaQuery(RESULTS_TABLE_MEDIA_QUERY);

  const results = (
    <ResultsSurface
      search={
        isHeadToHead && (
          <>
            <InlineSearchFieldSkeleton />
            <Skeleton aria-hidden="true" className="h-10 w-55 rounded-lg" />
          </>
        )
      }
      // Without a search, narrower pages leave no bar above the results.
      filters={
        (isHeadToHead || listsFilters) && <StatisticsFilterToolbarSkeleton />
      }
      filtersLabel={t("battlePanel.filters.title")}
      footer={<TablePaginationFooterSkeleton labelClassName="w-36" />}
    >
      <TableRowsSkeleton
        withHeader
        rowContent="text"
        mobileList={<CardListSkeleton card={props.mobileCard} />}
      />
    </ResultsSurface>
  );

  if (!isHeadToHead) {
    return (
      <DetailSkeleton
        meta={
          <span className="text-xs leading-tight">
            <SkeletonLine className="h-3 w-40" />
          </span>
        }
      >
        {results}
      </DetailSkeleton>
    );
  }

  // The opponents tab, inside the battle panel's page scroller.
  return (
    <div aria-busy="true" className="min-w-0">
      <h1 className="sr-only">{t(props.titleKey)}</h1>
      {results}
    </div>
  );
};
