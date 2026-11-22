import { TableRowsSkeleton } from "@/components/ui/table-rows-skeleton";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { FilterBar } from "@/components/common/filter-bar";
import { InlineSearchFieldSkeleton } from "@/components/common/inline-search-field-skeleton";
import { cn } from "cn";
import { ActivityLogsMobileListSkeleton } from "./components/activity-logs-mobile-list-skeleton";

const FILTER_WIDTHS = {
  clan: "w-[200px]",
  type: "w-[140px]",
  source: "w-[140px]",
  dateRange: "w-[130px]",
};

export const ActivityLogsPageSkeleton = () => (
  <div aria-busy="true" className="min-h-0 flex-1 overflow-hidden">
    <FilterBar search={<InlineSearchFieldSkeleton />}>
      {Object.entries(FILTER_WIDTHS).map(([filter, width]) => (
        <Skeleton
          key={filter}
          className={cn("hidden h-10 rounded-md xl:block", width)}
        />
      ))}
    </FilterBar>
    <div className="xl:hidden">
      <ActivityLogsMobileListSkeleton rows={20} />
    </div>
    <div className="hidden xl:block">
      <TableRowsSkeleton rows={20} withHeader rowContent="text" />
    </div>
  </div>
);
