import { CardListSkeleton } from "@/components/common/card-list-skeleton";
import { ResultsSurface } from "@/components/common/results-surface";
import { TablePaginationFooterSkeleton } from "@/components/ui/table-pagination-footer-skeleton";
import { TableRowsSkeleton } from "@/components/ui/table-rows-skeleton";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { KillsMobileCardSkeleton } from "./components/kills-mobile-card-skeleton";

export const KillsPageSkeleton = () => {
  return (
    <ScrollArea data-under-top-bar aria-busy="true" className="h-full min-h-0">
      <ResultsSurface
        filters={
          <>
            <Skeleton className="h-10 min-w-0 flex-1 rounded-lg md:w-[220px] md:flex-none" />
            <Skeleton className="size-10 rounded-lg md:hidden" />
            <Skeleton className="hidden h-10 w-[200px] rounded-lg md:block" />
            <Skeleton className="hidden h-10 w-[200px] rounded-lg md:block" />
            <Skeleton className="hidden h-10 w-[200px] rounded-lg md:block" />
            <Skeleton className="hidden h-10 w-[167px] rounded-lg md:block" />
          </>
        }
        footer={<TablePaginationFooterSkeleton />}
      >
        <TableRowsSkeleton
          trailingColumns={2}
          withHeader
          withNpcTile
          mobileList={<CardListSkeleton card={<KillsMobileCardSkeleton />} />}
        />
      </ResultsSurface>
    </ScrollArea>
  );
};
