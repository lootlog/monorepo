import { TableRowsSkeleton } from "@/components/ui/table-rows-skeleton";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { FilterBar } from "@/components/common/filter-bar";
import { InlineSearchFieldSkeleton } from "@/components/common/inline-search-field-skeleton";
import { cn } from "cn";
import { ActivityLogsMobileListSkeleton } from "./components/activity-logs-mobile-list-skeleton";

// The clan, type, source and date range filters of `ActivityLogsFilterFields`.
const FILTER_WIDTHS = ["w-[200px]", "w-[140px]", "w-[140px]", "w-[130px]"];

/** Route-level stand-in for the activity log: its filter bar above the entries. */
export const ActivityLogsPageSkeleton = () => (
  <div aria-busy="true" className="min-h-0 flex-1 overflow-hidden">
    {/* Narrower pages open the filters from a floating button instead. */}
    <FilterBar search={<InlineSearchFieldSkeleton />}>
      {FILTER_WIDTHS.map((width, index) => (
        <Skeleton
          key={index}
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
