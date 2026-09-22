import { cn } from "cn";
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
    <Skeleton className="h-9 min-w-0 flex-1 rounded-xl" />
    {isMobile ? (
      <Skeleton className="h-9 w-[42%] min-w-28 shrink-0 rounded-xl" />
    ) : (
      <>
        <div
          className={cn(
            "flex shrink-0 items-center gap-2",
            isCompactLayout ? "ml-auto" : "ml-1 w-[319px]",
          )}
        >
          <Skeleton className="h-9 min-w-0 flex-1 rounded-xl" />
          <Skeleton className="h-9 w-[4.5rem] shrink-0 rounded-xl" />
          <Skeleton className="size-9 shrink-0 rounded-xl" />
        </div>
      </>
    )}
  </FilterBar>
);
