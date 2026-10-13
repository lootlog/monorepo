import { CardListSkeleton } from "@/components/common/card-list-skeleton";
import { PageHeader } from "@/components/common/page-header";
import { SectionCard } from "@/components/common/section-card/section-card";
import { SkeletonLine } from "@/components/common/skeleton-line";
import { TablePaginationFooter } from "@/components/ui/table-pagination-footer";
import { TableRowsSkeleton } from "@/components/ui/table-rows-skeleton";
import { SectionCardHeader } from "@lootlog/ui/components/section-card-header";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { Swords } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { HeadToHeadFilterChipsSkeleton } from "./components/head-to-head-filter-chips-skeleton";
import type { HeadToHeadPageVariantProps } from "./use-head-to-head-page";

const noop = () => undefined;

type BattlePanelH2hSkeletonProps = {
  /** One placeholder of the card the route lists below `md` instead of its table. */
  mobileCard: ReactNode;
} & (
  | ({
      /** `HeadToHeadPageVariant`: static titles, and the character filter chip once a character is known. */
      variant: "head-to-head";
    } & Pick<HeadToHeadPageVariantProps, "subtitleKey" | "titleKey">)
  | {
      /** `PlayerVsPlayerFullPage`: titled by the loaded characters, with no default chips. */
      variant: "player-vs-player";
    }
);

// Stands in for the head-to-head pages: a page header above a `ResultsSurface`
// whose header carries the filter toolbar. Control widths are the loaded
// controls' intrinsic widths, so the results header wraps where the page's does.
export const BattlePanelH2hSkeleton = (props: BattlePanelH2hSkeletonProps) => {
  const { t } = useTranslation();
  const isHeadToHead = props.variant === "head-to-head";

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      <div className="px-3 pt-3 pb-0">
        {isHeadToHead ? (
          <PageHeader
            icon={Swords}
            title={t(props.titleKey)}
            description={t(props.subtitleKey)}
          />
        ) : (
          <PageHeader
            icon={Swords}
            title=<SkeletonLine className="h-5 w-56 max-w-full" />
            description=<SkeletonLine className="h-3 w-40" />
            metadata=<Skeleton className="h-12 w-8 rounded-lg" />
          />
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-3">
        <SectionCard className="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden border-border bg-card p-0">
          <SectionCardHeader
            className="shrink-0"
            title={
              isHeadToHead
                ? t(props.titleKey)
                : t("battlePanel.navigation.battles")
            }
            actions={
              isHeadToHead ? (
                <>
                  <div className="flex min-w-0 items-center gap-2 md:hidden">
                    <Skeleton className="h-10 w-[212px] min-w-0 rounded-lg" />
                    <Skeleton className="h-10 w-[84px] shrink-0 rounded-lg" />
                  </div>
                  <div className="hidden min-w-0 flex-wrap items-center gap-2 md:flex">
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
                  <div className="hidden min-w-0 flex-wrap items-center gap-2 md:flex">
                    <Skeleton className="h-10 w-[190px] rounded-lg" />
                    <Skeleton className="h-10 w-[94px] rounded-lg" />
                  </div>
                </>
              )
            }
          />
          {isHeadToHead && <HeadToHeadFilterChipsSkeleton />}
          <div className="relative min-h-0 flex-1 overflow-hidden">
            <TableRowsSkeleton
              withHeader
              rowContent="text"
              mobileList={<CardListSkeleton card={props.mobileCard} />}
            />
          </div>
          <TablePaginationFooter
            totalLabel=<Skeleton className="h-4 w-36" />
            hasPrev={false}
            hasNext={false}
            onPreviousPage={noop}
            onNextPage={noop}
          />
        </SectionCard>
      </div>
    </div>
  );
};
