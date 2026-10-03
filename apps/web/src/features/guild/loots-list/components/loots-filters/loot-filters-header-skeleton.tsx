import { FilterBar } from "@/components/common/filter-bar";
import { Skeleton } from "@lootlog/ui/components/skeleton";

type Props = {
  isMobile: boolean;
  isCompactLayout: boolean;
};

/** Mirrors the loots toolbar: search, world, view toggle and filter button. */
export const LootFiltersHeaderSkeleton = ({
  isMobile,
  isCompactLayout,
}: Props) => (
  <FilterBar ariaLabel="">
    <Skeleton
      className={
        isMobile
          ? "h-10 basis-full rounded-xl"
          : "h-10 min-w-48 flex-1 basis-48 rounded-xl"
      }
    />
    {isMobile ? (
      <>
        <Skeleton className="h-10 min-w-0 flex-1 rounded-xl" />
        <Skeleton className="h-10 w-24 shrink-0 rounded-xl" />
      </>
    ) : (
      <>
        {!isCompactLayout && (
          <div aria-hidden className="relative h-10 w-3 shrink-0">
            <div className="absolute inset-y-1 left-1/2 w-px -translate-x-1/2 bg-border" />
          </div>
        )}
        <div className="flex w-[19.5rem] shrink-0 items-center gap-2">
          <Skeleton className="h-10 min-w-0 flex-1 rounded-xl" />
          <Skeleton className="h-10 w-[4.5rem] shrink-0 rounded-xl" />
          <Skeleton className="size-10 shrink-0 rounded-xl" />
        </div>
      </>
    )}
  </FilterBar>
);
