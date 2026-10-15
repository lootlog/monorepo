import { FilterBar } from "@/components/common/filter-bar";
import { SectionCardSkeleton } from "@/components/common/section-card/section-card-skeleton";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { Skeleton } from "@lootlog/ui/components/skeleton";

/**
 * Stands in for a page that has no skeleton of its own: a filter bar above
 * section cards. It fills the shell's content area.
 */
export const PageSkeleton = () => (
  <ScrollArea className="h-full min-h-0">
    <div aria-busy="true">
      <FilterBar>
        <Skeleton className="h-10 w-full rounded-lg md:w-52" />
        <Skeleton className="hidden h-10 rounded-lg md:block md:w-44" />
      </FilterBar>

      <div className="flex flex-col gap-3 p-3">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <SectionCardSkeleton />
          <SectionCardSkeleton />
        </div>

        <SectionCardSkeleton />
      </div>
    </div>
  </ScrollArea>
);
