import { FilterBar } from "@/components/common/filter-bar";
import { InlineSearchFieldSkeleton } from "@/components/common/inline-search-field-skeleton";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { ListTileSkeleton } from "@/components/common/list-tile-skeleton";

export const GuildDocsListSkeleton = () => (
  <div aria-busy="true" className="min-h-0 flex-1 overflow-hidden">
    <FilterBar search={<InlineSearchFieldSkeleton />}>
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-16 rounded-lg" />
        <Skeleton className="h-8 w-24 rounded-control" />
      </div>
    </FilterBar>
    {Array.from({ length: 6 }).map((_, index) => (
      <ListTileSkeleton key={index} />
    ))}
  </div>
);
