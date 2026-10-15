import { TableRowsSkeleton } from "@/components/ui/table-rows-skeleton";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { FilterBar } from "@/components/common/filter-bar";
import { ActivityLogsMobileListSkeleton } from "./components/activity-logs-mobile-list-skeleton";

const DESKTOP_FILTER_WIDTHS = [
  "w-[200px]",
  "w-[150px]",
  "w-[160px]",
  "w-[160px]",
  "w-[130px]",
];

/** Route-level stand-in for the activity log: its filter bar above the entries. */
export const ActivityLogsPageSkeleton = () => (
  <div aria-busy="true" className="min-h-0 flex-1 overflow-hidden">
    <FilterBar>
      {/* The same container query as `ActivityLogsFilterToolbar`. */}
      <div className="@container/activity-filters w-full min-w-0">
        <div className="flex w-full min-w-0 items-center gap-2">
          <Skeleton className="h-10 min-w-0 flex-1 rounded-md @min-[66rem]/activity-filters:min-w-60" />
          <Skeleton className="h-10 w-24 shrink-0 rounded-md @min-[66rem]/activity-filters:hidden" />
          {DESKTOP_FILTER_WIDTHS.map((width, index) => (
            <Skeleton
              key={index}
              className={`hidden h-10 rounded-md @min-[66rem]/activity-filters:block ${width}`}
            />
          ))}
        </div>
      </div>
    </FilterBar>
    <div className="xl:hidden">
      <ActivityLogsMobileListSkeleton rows={20} />
    </div>
    <div className="hidden xl:block">
      <TableRowsSkeleton rows={20} withHeader rowContent="text" />
    </div>
  </div>
);
