import { InlineSearchFieldSkeleton } from "@/components/common/inline-search-field-skeleton";
import { CardListSkeleton } from "@/components/common/card-list-skeleton";
import { ResultsSurface } from "@/components/common/results-surface";
import { TablePaginationFooterSkeleton } from "@/components/ui/table-pagination-footer-skeleton";
import { TableRowsSkeleton } from "@/components/ui/table-rows-skeleton";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { KillsMobileCardSkeleton } from "./components/kills-mobile-card-skeleton";

// World, period, monster type, and level range.
const FILTER_WIDTHS = ["w-[200px]", "w-[200px]", "w-[200px]", "w-[167px]"];

export const KillsPageSkeleton = () => {
  return (
    <ScrollArea data-under-top-bar aria-busy="true" className="h-full min-h-0">
      <ResultsSurface
        search={<InlineSearchFieldSkeleton />}
        filters={FILTER_WIDTHS.map((width, index) => (
          <Skeleton
            key={index}
            aria-hidden="true"
            className={`hidden h-10 rounded-lg xl:block ${width}`}
          />
        ))}
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
