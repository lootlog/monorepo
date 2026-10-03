import { FilterBar } from "@/components/common/filter-bar";
import { SectionCardSkeleton } from "@/components/common/section-card/section-card-skeleton";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { Skeleton } from "@lootlog/ui/components/skeleton";

/**
 * Stands in for a page that has no skeleton of its own, in the battle panel's
 * layout: a filter bar above section cards. It fills the shell's content area.
 */
export const PageSkeleton = () => (
  <ScrollArea className="h-full min-h-0 pt-3">
    <div aria-busy="true" className="flex min-h-full flex-col gap-3 px-3 pb-3">
      <FilterBar>
        <Skeleton className="h-10 w-full rounded-xl md:w-52" />
        <Skeleton className="hidden h-10 rounded-xl md:block md:w-44" />
      </FilterBar>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <SectionCardSkeleton />
        <SectionCardSkeleton />
      </div>

      <SectionCardSkeleton />
    </div>
  </ScrollArea>
);
