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
  mobileCard: ReactNode;
} & (
  | ({
      variant: "head-to-head";
    } & Pick<HeadToHeadPageVariantProps, "titleKey">)
  | {
      variant: "player-vs-player";
    }
);

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
      filters={
        (isHeadToHead || listsFilters) && <StatisticsFilterToolbarSkeleton />
      }
      filtersLabel={t("battlePanel.filters.title")}
      footer={<TablePaginationFooterSkeleton labelClassName="w-36" />}
    >
      <TableRowsSkeleton
        rows={20}
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

  return (
    <div aria-busy="true" className="min-w-0">
      <h1 className="sr-only">{t(props.titleKey)}</h1>
      {results}
    </div>
  );
};
