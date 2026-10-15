import { CardListSkeleton } from "@/components/common/card-list-skeleton";
import { DetailSkeleton } from "@/components/common/detail-skeleton";
import { ResultsSurface } from "@/components/common/results-surface";
import { SkeletonLine } from "@/components/common/skeleton-line";
import { TablePaginationFooterSkeleton } from "@/components/ui/table-pagination-footer-skeleton";
import { TableRowsSkeleton } from "@/components/ui/table-rows-skeleton";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { HeadToHeadFilterChipsSkeleton } from "./components/head-to-head-filter-chips-skeleton";
import type { HeadToHeadPageVariantProps } from "./use-head-to-head-page";

type BattlePanelH2hSkeletonProps = {
  /** One placeholder of the card the route lists below `md` instead of its table. */
  mobileCard: ReactNode;
} & (
  | ({
      /** `HeadToHeadPageVariant`: static titles, and the character filter chip once a character is known. */
      variant: "head-to-head";
    } & Pick<HeadToHeadPageVariantProps, "titleKey">)
  | {
      /** `PlayerVsPlayerFullPage`: named by the loaded characters, with no default chips. */
      variant: "player-vs-player";
    }
);

// Stands in for the head-to-head pages: a `ResultsSurface` whose filter bar
// carries the filter toolbar. Control widths are the loaded controls'
// intrinsic widths, so the bar wraps where the page's does.
export const BattlePanelH2hSkeleton = (props: BattlePanelH2hSkeletonProps) => {
  const { t } = useTranslation();
  const isHeadToHead = props.variant === "head-to-head";

  const results = (
    <ResultsSurface
      filters={
        isHeadToHead ? (
          <>
            <div className="flex w-full min-w-0 items-center gap-2 md:hidden">
              <Skeleton className="h-10 w-[212px] min-w-0 rounded-lg" />
              <Skeleton className="h-10 w-[84px] shrink-0 rounded-lg" />
            </div>
            <div className="hidden w-full min-w-0 flex-wrap items-center gap-2 md:flex">
              <Skeleton className="h-10 min-w-[260px] flex-1 rounded-lg xl:max-w-[360px]" />
              <Skeleton className="h-10 w-[190px] rounded-lg" />
              <Skeleton className="h-10 w-[170px] rounded-lg" />
              <Skeleton className="h-10 w-[94px] rounded-lg" />
            </div>
          </>
        ) : (
          <>
            <div className="flex w-full min-w-0 items-center gap-2 md:hidden">
              <Skeleton className="h-10 min-w-[175px] flex-1 rounded-lg" />
              <Skeleton className="h-10 w-[84px] shrink-0 rounded-lg" />
            </div>
            <div className="hidden w-full min-w-0 flex-wrap items-center gap-2 md:flex">
              <Skeleton className="h-10 w-[190px] rounded-lg" />
              <Skeleton className="h-10 w-[94px] rounded-lg" />
            </div>
          </>
        )
      }
      filtersLabel={t("battlePanel.filters.title")}
      chipsPlaceholder={isHeadToHead && <HeadToHeadFilterChipsSkeleton />}
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

  return (
    <ScrollArea data-under-top-bar aria-busy="true" className="h-full min-h-0">
      <h1 className="sr-only">{t(props.titleKey)}</h1>
      {results}
    </ScrollArea>
  );
};
