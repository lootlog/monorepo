import { SkeletonLine } from "@/components/common/skeleton-line";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { cn } from "cn";

const TYPE_COUNT_WIDTHS = ["w-12", "w-14", "w-14", "w-16", "w-16"];

type StatsMobileListSkeletonProps = {
  /** A member avatar or an NPC sprite, whose 40px tile sets the row height. */
  media: "avatar" | "npcTile";
  /** Rows carry a wrapping line of per-NPC-type counts below the name. */
  withTypeCounts?: boolean;
  rows?: number;
};

/** Stands in for the ranked list the stats pages render instead of their table below `md`. */
export const StatsMobileListSkeleton = ({
  media,
  withTypeCounts = false,
  rows = 10,
}: StatsMobileListSkeletonProps) => (
  <ul aria-hidden="true">
    {Array.from({ length: rows }, (_, index) => (
      <li key={index} className="border-b border-border p-3 last:border-b-0">
        <div className="flex min-w-0 items-center gap-3">
          <Skeleton className="size-6 shrink-0 rounded-md" />
          {media === "avatar" ? (
            <Skeleton className="size-8 shrink-0 rounded-full" />
          ) : (
            <Skeleton className="h-10 w-8 shrink-0 rounded-lg" />
          )}
          <div className="flex min-w-0 flex-1 flex-col">
            <div
              className={cn("text-sm", media === "npcTile" && "leading-tight")}
            >
              <SkeletonLine className="h-3.5 w-32 max-w-full" />
            </div>
            {media === "npcTile" && (
              <div className="text-xs">
                <SkeletonLine className="h-3 w-24 max-w-full" />
              </div>
            )}
          </div>
          <div className="shrink-0 text-sm">
            <SkeletonLine className="h-3.5 w-10" />
          </div>
        </div>
        {withTypeCounts && (
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 pl-9 text-xs">
            {TYPE_COUNT_WIDTHS.map((width, countIndex) => (
              <SkeletonLine key={countIndex} className={cn("h-3", width)} />
            ))}
          </div>
        )}
      </li>
    ))}
  </ul>
);
