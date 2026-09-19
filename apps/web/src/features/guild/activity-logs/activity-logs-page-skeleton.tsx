import { ResultsSurface } from "@/components/common/results-surface";
import { TableRowsSkeleton } from "@/components/ui/table-rows-skeleton";
import { Skeleton } from "@lootlog/ui/components/skeleton";

const DESKTOP_FILTER_WIDTHS = [
  "w-[200px]",
  "w-[150px]",
  "w-[160px]",
  "w-[160px]",
  "w-[130px]",
];

export const ActivityLogsPageSkeleton = () => (
  <div className="flex h-full min-h-0 flex-col bg-background p-3">
    <ResultsSurface
      toolbar={
        <div
          aria-hidden="true"
          className="flex w-full min-w-0 flex-wrap items-center gap-2"
        >
          <Skeleton className="h-10 min-w-0 flex-1 rounded-md md:min-w-60" />
          <Skeleton className="h-10 w-24 shrink-0 rounded-md md:hidden" />
          {DESKTOP_FILTER_WIDTHS.map((width, index) => (
            <Skeleton
              key={index}
              className={`hidden h-10 rounded-md md:block ${width}`}
            />
          ))}
        </div>
      }
      footer={<div className="h-14 shrink-0 border-t border-border" />}
    >
      <TableRowsSkeleton rows={20} />
    </ResultsSurface>
  </div>
);
