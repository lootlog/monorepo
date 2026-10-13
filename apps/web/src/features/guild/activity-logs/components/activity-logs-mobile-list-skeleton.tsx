import { SkeletonLine } from "@/components/common/skeleton-line";
import { Skeleton } from "@lootlog/ui/components/skeleton";

type ActivityLogsMobileListSkeletonProps = {
  rows: number;
};

/** Stands in for the list `ActivityLogsTable` renders below `md`. */
export const ActivityLogsMobileListSkeleton = ({
  rows,
}: ActivityLogsMobileListSkeletonProps) => (
  <ul aria-hidden="true">
    {Array.from({ length: rows }, (_, index) => (
      <li
        key={index}
        className="flex h-[88px] flex-col justify-center gap-2 border-b border-border px-3"
      >
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Skeleton className="size-8 shrink-0 rounded-lg" />
            <div className="min-w-0 text-sm">
              <SkeletonLine className="h-3.5 w-28 max-w-full" />
            </div>
          </div>
          <div className="shrink-0 text-xs">
            <SkeletonLine className="h-3 w-16" />
          </div>
          <Skeleton className="size-8 shrink-0 rounded-md" />
        </div>
        <div className="min-w-0 pl-11 text-xs">
          <SkeletonLine className="h-3 w-44 max-w-full" />
        </div>
      </li>
    ))}
  </ul>
);
