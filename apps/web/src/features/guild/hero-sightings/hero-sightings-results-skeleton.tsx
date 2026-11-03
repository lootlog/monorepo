import { Skeleton } from "@lootlog/ui/components/skeleton";
import { cn } from "cn";
import {
  LIST_BAND_HEADING_CLASS,
  LIST_GROUP_HEADING_CLASS,
  LIST_TILE_INSET_CLASS,
  LIST_TILE_RULE_CLASS,
} from "@/components/common/list-tile";

const SKELETON_ROWS = 6;

/** Stands in for the board: a banded group heading above `HeroSightingRow`s. */
export const HeroSightingsResultsSkeleton = () => (
  <div aria-busy="true">
    <div
      className={cn(
        LIST_GROUP_HEADING_CLASS,
        LIST_TILE_INSET_CLASS,
        LIST_BAND_HEADING_CLASS,
      )}
    >
      <Skeleton className="h-3 w-24" />
    </div>
    {Array.from({ length: SKELETON_ROWS }, (_, index) => (
      <div
        key={index}
        data-list-tile
        className={cn(
          LIST_TILE_RULE_CLASS,
          LIST_TILE_INSET_CLASS,
          "grid grid-cols-[2.25rem_minmax(0,1fr)_auto] gap-x-3 gap-y-2.5 py-3",
          "xl:grid-cols-[2.25rem_minmax(0,16rem)_minmax(0,1fr)_12rem_minmax(0,1fr)_10rem] xl:items-center xl:gap-x-5",
        )}
      >
        <Skeleton className="size-9 rounded-lg" />
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
        <Skeleton className="h-8 w-28 rounded-lg xl:col-start-6" />
        <div className="col-span-2 col-start-2 flex flex-col gap-1.5 xl:col-span-1 xl:col-start-3 xl:row-start-1">
          <Skeleton className="h-3.5 w-2/3" />
          <Skeleton className="h-3 w-1/3" />
        </div>
        <div className="col-span-2 col-start-2 flex gap-2 xl:col-span-1 xl:col-start-4 xl:row-start-1 xl:flex-col xl:gap-1.5">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="col-span-2 col-start-2 h-7 w-40 rounded-full xl:col-span-1 xl:col-start-5 xl:row-start-1" />
      </div>
    ))}
  </div>
);
